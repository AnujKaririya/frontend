// Thin wrapper over every endpoint in the backend (/api/v1/...).
const BASE = (window.VIDLY_API || "").replace(/\/$/, "") + "/api/v1";
let token = localStorage.getItem("vt_token") || "";
let onUnauthorized = () => {};

export const setToken = (t) => { token = t || ""; t ? localStorage.setItem("vt_token", t) : localStorage.removeItem("vt_token"); };
export const getToken = () => token;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// The backend has no error-handling middleware, so Express answers errors with an HTML page.
// Pull the real message out of it when we can.
function messageFromHtml(text) {
  const m = /<pre>([\s\S]*?)<\/pre>/i.exec(text || "");
  if (!m) return "";
  const first = m[1].split(/<br\s*\/?>/i)[0];
  const el = document.createElement("textarea");
  el.innerHTML = first;
  return el.value.replace(/^\w*Error:\s*/, "").trim();
}
function parse(status, text, silent401) {
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (status >= 200 && status < 300) return data ?? {};
  const msg = data?.message || messageFromHtml(text) || `Request failed (${status})`;
  if (status === 401 && !silent401) onUnauthorized();
  throw new ApiError(status, msg);
}
const qs = (q) => {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null) p.set(k, v);
  return "?" + p.toString();
};

function xhr(url, { method, form, onProgress, silent401 }) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, url);
    if (token) x.setRequestHeader("Authorization", "Bearer " + token);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { try { resolve(parse(x.status, x.responseText, silent401)); } catch (e) { reject(e); } };
    x.onerror = () => reject(new ApiError(0, "Cannot reach the server. Is the backend running?"));
    x.send(form);
  });
}

async function request(path, { method = "GET", query, json, form, onProgress, silent401 = false } = {}) {
  const url = BASE + path + qs(query);
  if (form && onProgress) return xhr(url, { method, form, onProgress, silent401 });
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  let body;
  if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  else if (form) body = form;
  const ctrl = new AbortController();
  // Some backend handlers swallow errors without replying, which would hang forever.
  const timer = setTimeout(() => ctrl.abort(), form ? 10 * 60_000 : 25_000);
  let res;
  try { res = await fetch(url, { method, headers, body, credentials: "include", signal: ctrl.signal }); }
  catch (e) { throw new ApiError(0, e.name === "AbortError" ? "The server took too long to respond." : "Cannot reach the server. Is the backend running?"); }
  finally { clearTimeout(timer); }
  return parse(res.status, await res.text(), silent401);
}

const fd = (obj) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== "") f.append(k, v);
  return f;
};

export const api = {
  health: () => request("/healthchecks/"),

  // users
  register: (fields) => request("/users/register", { method: "POST", form: fd(fields), silent401: true }),
  login: (body) => request("/users/loginUser", { method: "POST", json: body, silent401: true }),
  logout: () => request("/users/logoutUser", { method: "POST", silent401: true }),
  changePassword: (password, newPassword) => request("/users/changeCurrentPassword", { method: "POST", json: { password, newPassword }, silent401: true }),
  updateAccount: (body) => request("/users/update-account", { method: "PATCH", json: body }),
  updateAvatar: (file) => request("/users/avatar", { method: "PATCH", form: fd({ avatar: file }) }),
  updateCover: (file) => request("/users/coverImage", { method: "PATCH", form: fd({ coverImage: file }) }),
  channelProfile: (username) => request("/users/getUserChannelProfile", { method: "POST", json: { username } }),

  // videos
  videos: (q) => request("/videos/", { query: q }),
  video: (id) => request(`/videos/${id}`),
  publish: (fields, onProgress) => request("/videos/", { method: "POST", form: fd(fields), onProgress }),
  updateVideo: (id, fields) => request(`/videos/${id}`, { method: "PATCH", form: fd(fields) }),
  deleteVideo: (id) => request(`/videos/${id}`, { method: "DELETE" }),
  togglePublish: (id) => request(`/videos/toggle/publish/${id}`, { method: "PATCH" }),

  // comments
  comments: (videoId, q) => request(`/comments/${videoId}`, { query: q }),
  addComment: (videoId, content) => request(`/comments/${videoId}`, { method: "POST", json: { content } }),
  updateComment: (id, content) => request(`/comments/c/${id}`, { method: "PATCH", json: { content } }),
  deleteComment: (id) => request(`/comments/c/${id}`, { method: "DELETE" }),

  // likes
  likeVideo: (id) => request(`/likes/toggle/v/${id}`, { method: "POST" }),
  likeComment: (id) => request(`/likes/toggle/c/${id}`, { method: "POST" }),
  likeTweet: (id) => request(`/likes/toggle/t/${id}`, { method: "POST" }),
  likedVideos: () => request("/likes/videos"),

  // tweets (community posts)
  createTweet: (content) => request("/tweets/", { method: "POST", json: { content } }),
  userTweets: (userId) => request(`/tweets/user/${userId}`),
  updateTweet: (id, content) => request(`/tweets/${id}`, { method: "PATCH", json: { content } }),
  deleteTweet: (id) => request(`/tweets/${id}`, { method: "DELETE" }),

  // playlists
  createPlaylist: (name, description) => request("/playlists/", { method: "POST", json: { name, description } }),
  userPlaylists: (userId) => request(`/playlists/user/${userId}`),
  playlist: (id) => request(`/playlists/${id}`),
  updatePlaylist: (id, body) => request(`/playlists/${id}`, { method: "PATCH", json: body }),
  deletePlaylist: (id) => request(`/playlists/${id}`, { method: "DELETE" }),
  addToPlaylist: (videoId, playlistId) => request(`/playlists/add/${videoId}/${playlistId}`, { method: "PATCH" }),
  removeFromPlaylist: (videoId, playlistId) => request(`/playlists/remove/${videoId}/${playlistId}`, { method: "PATCH" }),

  // subscriptions (backend compares the string "true")
  setSubscription: (channelId, on) => request(`/subscriptions/c/${channelId}`, { method: "POST", json: { enabled: on ? "true" : "false" } }),
  subscribers: (channelId) => request(`/subscriptions/u/${channelId}`),
  subscribedTo: (subscriberId) => request(`/subscriptions/c/${subscriberId}`),

  // dashboard
  stats: () => request("/dashboards/stats"),
  myVideoIds: () => request("/dashboards/videos"),
  history: () => request("/dashboards/watchHistory"),
  clearHistory: () => request("/dashboards/clearWatchHistory"),
};
