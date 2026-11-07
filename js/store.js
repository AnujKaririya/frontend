// App state: session, caches, and the helpers that work around gaps in the API
// (e.g. videos only carry an owner *id*, lists of ids need resolving, etc.).
import { api, setToken } from "./api.js";

const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export const state = {
  user: ls.get("vt_user", null),
  videos: new Map(),        // id -> video
  owners: new Map(),        // userId -> { _id, username, fullName, avatar }
  likedVideos: new Set(),
  likedComments: new Set(), // the API can't tell us this, so we remember toggles locally
  likedTweets: new Set(),
  myComments: new Set(),    // ids of comments this user wrote (list endpoint omits owners)
  subs: [],                 // channel profiles I'm subscribed to
  subsLoaded: false,
};

const persisted = { likedComments: "lc", likedTweets: "lt", myComments: "mc" };
function loadPersisted() {
  for (const [name, key] of Object.entries(persisted)) state[name] = new Set(state.user ? ls.get(`vt_${key}_${state.user._id}`, []) : []);
}
export function savePersisted(name) {
  if (state.user) ls.set(`vt_${persisted[name]}_${state.user._id}`, [...state[name]].slice(-2000));
}
const myVideosKey = () => `vt_myvideos_${state.user?._id}`;

export function setUser(user, token) {
  state.user = user;
  if (token !== undefined) setToken(token);
  ls.set("vt_user", user);
  rememberOwner(user);
  loadPersisted();
  if (user) for (const v of ls.get(myVideosKey(), [])) state.videos.set(v._id, v);
}
export function clearSession() {
  state.user = null; setToken("");
  ls.del("vt_user");
  state.videos.clear(); state.owners.clear(); state.likedVideos.clear(); state.subs = []; state.subsLoaded = false;
  resetCatalog();
}
export function rememberOwner(p) {
  if (p?._id) state.owners.set(p._id, { _id: p._id, username: p.username, fullName: p.fullName, avatar: p.avatar });
}
export const ownerOf = (id) => state.owners.get(id) || null;
export const isMe = (id) => !!state.user && state.user._id === id;

export function cacheVideo(v) {
  if (!v?._id) return v;
  // If the backend populates `owner` ({_id, username, fullName, avatar}), remember it
  // and flatten back to an id so the rest of the app works with either shape.
  if (v.owner && typeof v.owner === "object") { rememberOwner(v.owner); v.owner = v.owner._id; }
  state.videos.set(v._id, v);
  if (isMe(v.owner)) { // keep my own videos so unpublished ones still show a title in Studio
    const mine = ls.get(myVideosKey(), []).filter((x) => x._id !== v._id);
    mine.push(v); ls.set(myVideosKey(), mine.slice(-300));
  }
  return v;
}
export function forgetVideo(id) {
  state.videos.delete(id);
  ls.set(myVideosKey(), ls.get(myVideosKey(), []).filter((x) => x._id !== id));
  resetCatalog();
}

export async function loadLikedVideos() {
  const r = await api.likedVideos();
  state.likedVideos = new Set();
  for (const l of r.data || []) if (l.video?._id) { state.likedVideos.add(l.video._id); cacheVideo(l.video); }
  return (r.data || []).map((l) => l.video).filter(Boolean);
}

// Subscriptions only return usernames, so resolve each to a profile (which also gives us _id/avatar).
export async function loadSubs() {
  if (!state.user) return;
  const r = await api.subscribedTo(state.user._id);
  const names = [...new Set(r.data?.usernameList || [])];
  const profiles = await Promise.all(names.map((n) => api.channelProfile(n).then((x) => x.data?.[0]).catch(() => null)));
  state.subs = profiles.filter(Boolean);
  state.subs.forEach(rememberOwner);
  state.subsLoaded = true;
}

// ---- catalog: walk getAllVideos page by page and cache everything we see ----
const PAGE = 50, MAX_PAGES = 20;
let nextPage = 1, catalogDone = false, loading = null;
export function resetCatalog() { nextPage = 1; catalogDone = false; }
export const listVideos = ({ page = 1, limit = 12, query = "", sortBy = "createdAt", sortType = "desc" } = {}) =>
  api.videos({ page, limit, query, sortBy, sortType }).then((r) => (r.data || []).map(cacheVideo));

async function loadNextCatalogPage() {
  if (catalogDone || nextPage > MAX_PAGES) { catalogDone = true; return; }
  if (!loading) loading = listVideos({ page: nextPage, limit: PAGE }).then((vs) => { nextPage++; if (vs.length < PAGE) catalogDone = true; }).finally(() => (loading = null));
  await loading;
}
export async function ensureVideos(ids) {
  while (!catalogDone && ids.some((id) => !state.videos.has(id))) await loadNextCatalogPage();
  return ids.map((id) => state.videos.get(id) || null);
}
export async function allVideos() {
  while (!catalogDone) await loadNextCatalogPage();
  return [...state.videos.values()].filter((v) => v.isPublished !== false);
}
