import { h, clear, toast, modal, confirmDialog, secure, fmtCount } from "../util.js";
import { icon } from "../icons.js";
import { api } from "../api.js";
import { state, ensureVideos, loadLikedVideos, allVideos, isMe, cacheVideo } from "../store.js";
import { videoRow, videoCard, unavailableRow, emptyState, avatar } from "../components.js";
import { playlistGrid } from "./channel.js";

// ---- Watch history (API returns video ids only; newest last, with duplicates) ----
export async function historyPage() {
  const raw = (await api.history()).data || [];
  const ids = [...new Set([...raw].reverse())];
  const wrap = h("div", { class: "list-wrap" });
  const head = h("div", { class: "page-head" }, h("h1", { class: "page-title" }, "Watch history"),
    ids.length ? h("button", { class: "pill-btn", onclick: async () => {
      if (!(await confirmDialog({ title: "Clear watch history?", message: "Your watch history will be removed.", confirmText: "Clear" }))) return;
      try { await api.clearHistory(); clear(list).append(emptyState("history", "Watch history cleared", "")); clear(head).append(h("h1", { class: "page-title" }, "Watch history")); toast("Watch history cleared"); } catch (e) { toast(e.message, "error"); }
    } }, icon("trash", { size: 18 }), "Clear all watch history") : null);
  const list = h("div");
  if (!ids.length) list.append(emptyState("history", "Nothing watched yet", "Videos you watch will show up here."));
  else {
    const vs = await ensureVideos(ids);
    vs.forEach((v) => list.append(v ? videoRow(v) : unavailableRow()));
  }
  wrap.append(head, list);
  return wrap;
}

// ---- Liked videos ----
export async function likedPage() {
  const vs = await loadLikedVideos();
  const wrap = h("div", { class: "list-wrap" }, h("h1", { class: "page-title" }, "Liked videos"));
  if (!vs.length) wrap.append(emptyState("like", "No liked videos", "Videos you like will show up here."));
  else vs.slice().reverse().forEach((v) => wrap.append(videoRow(v)));
  return wrap;
}

// ---- Subscriptions: channel list + their latest videos ----
export async function subscriptionsPage() {
  const wrap = h("div");
  if (!state.subsLoaded) { const { loadSubs } = await import("../store.js"); await loadSubs(); }
  const subs = state.subs;
  if (!subs.length) return emptyState("subs", "Don't miss new videos", "Subscribe to channels and they'll show up here.");
  const ids = new Set(subs.map((s) => s._id));
  wrap.append(h("h2", { class: "page-title" }, "Channels"),
    h("div", { class: "chan-grid" }, subs.map((s) => h("a", { class: "chan-card", href: `#/channel/${s.username}` }, avatar(s, 88), h("b", null, s.fullName), h("span", { class: "muted" }, `@${s.username} · ${fmtCount(s.subscribersCount)} subscribers`)))));
  const vs = (await allVideos()).filter((v) => ids.has(v.owner)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  wrap.append(h("h2", { class: "page-title" }, "Latest"));
  wrap.append(vs.length ? h("div", { class: "grid" }, vs.map(videoCard)) : emptyState("video", "No videos yet", "These channels haven't published anything."));
  return wrap;
}

// ---- My playlists ----
export async function playlistsPage() {
  const wrap = h("div");
  const holder = h("div");
  const load = async () => { const pls = (await api.userPlaylists(state.user._id)).data || []; clear(holder).append(pls.length ? await playlistGrid(pls) : emptyState("playlist", "No playlists yet", "Create one to organise your videos.")); };
  wrap.append(h("div", { class: "page-head" }, h("h1", { class: "page-title" }, "Playlists"),
    h("button", { class: "pill-btn primary", onclick: () => playlistModal(null, load) }, icon("plus", { size: 18 }), "New playlist")), holder);
  await load();
  return wrap;
}

export function playlistModal(existing, done) {
  const name = h("input", { type: "text", value: existing?.name || "" });
  const desc = h("textarea"); desc.value = existing?.description || "";
  const err = h("p", { class: "err" });
  const save = h("button", { class: "pill-btn primary" }, existing ? "Save" : "Create");
  const m = modal(existing ? "Edit playlist" : "New playlist", h("div", null,
    h("div", { class: "field" }, h("label", null, "Name"), name), h("div", { class: "field" }, h("label", null, "Description"), desc), err,
    h("div", { class: "btn-row" }, h("button", { class: "pill-btn", onclick: () => m.close() }, "Cancel"), save)));
  save.onclick = async () => {
    if (!name.value.trim() || !desc.value.trim()) { err.textContent = "Name and description are required"; return; }
    save.disabled = true;
    try {
      const r = existing ? await api.updatePlaylist(existing._id, { name: name.value.trim(), description: desc.value.trim() }) : await api.createPlaylist(name.value.trim(), desc.value.trim());
      m.close(); toast(existing ? "Playlist updated" : "Playlist created"); await done(r.data);
    } catch (e) { err.textContent = e.message; save.disabled = false; }
  };
}

// ---- Single playlist ----
export async function playlistPage({ params }) {
  const p = (await api.playlist(params.id)).data; // videos are populated here
  (p.videos || []).forEach(cacheVideo);
  const mine = isMe(p.owner);
  const info = h("div", { class: "pl-info" });
  const list = h("div");
  const paint = () => {
    const first = p.videos?.[0];
    clear(info).append(
      h("div", { class: "thumb", style: { aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "var(--bg-3)" } }, first && h("img", { src: secure(first.thumbnail), alt: "", style: { width: "100%", height: "100%", objectFit: "cover" } })),
      h("h1", null, p.name), h("div", { class: "muted" }, `${p.videos?.length || 0} video${p.videos?.length === 1 ? "" : "s"}`), h("p", null, p.description),
      mine && h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
        h("button", { class: "pill-btn", onclick: () => playlistModal(p, (u) => { p.name = u.name; p.description = u.description; paint(); }) }, icon("edit", { size: 18 }), "Edit"),
        h("button", { class: "pill-btn", onclick: async () => {
          if (!(await confirmDialog({ title: "Delete playlist?", message: `“${p.name}” will be permanently deleted.` }))) return;
          try { await api.deletePlaylist(p._id); toast("Playlist deleted"); location.hash = "#/playlists"; } catch (e) { toast(e.message, "error"); }
        } }, icon("trash", { size: 18 }), "Delete")));
    clear(list);
    if (!p.videos?.length) list.append(emptyState("playlist", "This playlist is empty", "Use “Save” on a video to add it here."));
    (p.videos || []).forEach((v) => list.append(videoRow(v, { actions: mine && h("button", { class: "icon-btn", title: "Remove from playlist", onclick: async () => {
      try { await api.removeFromPlaylist(v._id, p._id); p.videos = p.videos.filter((x) => x._id !== v._id); paint(); toast("Removed from playlist"); } catch (e) { toast(e.message, "error"); }
    } }, icon("close", { size: 20 })) })));
  };
  paint();
  return h("div", { class: "pl-layout" }, info, list);
}
