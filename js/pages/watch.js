import { h, clear, toast, modal, confirmDialog, fmtViews, timeAgo, fmtCount, secure, spinner, errorBox } from "../util.js";
import { icon } from "../icons.js";
import { api } from "../api.js";
import { state, cacheVideo, forgetVideo, isMe, ownerOf, rememberOwner, listVideos, loadSubs, savePersisted } from "../store.js";
import { avatar, channelHref, ownerName, subscribeControl, videoRow } from "../components.js";

export async function watchPage({ params }) {
  const id = params.id;
  const v = cacheVideo((await api.video(id)).data);
  document.title = v.title + " – Vidly";

  const likeBtn = h("button", { class: "pill-btn" });
  const paintLike = () => {
    const on = state.likedVideos.has(id);
    likeBtn.className = "pill-btn" + (on ? " active" : "");
    clear(likeBtn).append(icon("like", { size: 20, fill: on }), on ? "Liked" : "Like");
  };
  paintLike();
  likeBtn.onclick = async () => {
    likeBtn.disabled = true;
    try {
      const r = await api.likeVideo(id);
      r.data ? state.likedVideos.add(id) : state.likedVideos.delete(id);
      paintLike();
    } catch (e) { toast(e.message, "error"); }
    likeBtn.disabled = false;
  };

  const saveBtn = h("button", { class: "pill-btn", onclick: () => savePlaylistModal(id) }, icon("save", { size: 20 }), "Save");

  let ownerActions = null;
  if (isMe(v.owner)) {
    ownerActions = [
      h("button", { class: "pill-btn", onclick: () => editVideoModal(v, (nv) => { v.title = nv.title; v.description = nv.description; v.thumbnail = nv.thumbnail; titleEl.textContent = nv.title; descBody.textContent = nv.description; player.poster = secure(nv.thumbnail); }) }, icon("edit", { size: 20 }), "Edit"),
      h("button", { class: "pill-btn", onclick: async () => {
        if (!(await confirmDialog({ title: "Delete video?", message: "This permanently deletes the video. This can't be undone." }))) return;
        try { await api.deleteVideo(id); forgetVideo(id); toast("Video deleted"); location.hash = "#/studio"; } catch (e) { toast(e.message, "error"); }
      } }, icon("trash", { size: 20 }), "Delete"),
    ];
  }

  const player = h("video", { controls: true, autoplay: true, playsinline: true, src: secure(v.videoFile), poster: secure(v.thumbnail) });
  const titleEl = h("h1", { class: "w-title" }, v.title);
  const subCount = h("small", null, "");
  const owner = ownerOf(v.owner);
  const descBody = h("div", { class: "body" }, v.description || "");
  const descBox = h("div", { class: "desc-box", onclick: () => descBox.classList.toggle("open") },
    h("div", { class: "meta" }, `${fmtCount(v.views)} view${v.views === 1 ? "" : "s"} · ${timeAgo(v.createdAt)}`), descBody,
    v.description && v.description.length > 100 && h("div", { class: "tog" }, "Show more"));
  descBox.addEventListener("click", () => { const t = descBox.querySelector(".tog"); if (t) t.textContent = descBox.classList.contains("open") ? "Show less" : "Show more"; });

  const side = h("div", { class: "w-side" });
  loadUpNext(side, id);

  const page = h("div", { class: "watch" },
    h("div", null,
      h("div", { class: "player" }, player), titleEl,
      h("div", { class: "w-bar" },
        h("div", { class: "w-chan" },
          h("a", { href: channelHref(v.owner) }, avatar(owner, 40)),
          h("div", null, h("a", { href: channelHref(v.owner) }, h("b", null, ownerName(v.owner))), subCount),
          subscribeControl(v.owner, { onCount: (n) => (subCount.textContent = `${fmtCount(n)} subscriber${n === 1 ? "" : "s"}`) })),
        h("div", { class: "w-actions" }, likeBtn, saveBtn, ownerActions)),
      descBox,
      commentsSection(id)),
    side);
  page._cleanup = () => { player.pause(); document.title = "Vidly"; };
  return page;
}

async function loadUpNext(side, currentId) {
  side.append(spinner());
  try {
    const vs = (await listVideos({ page: 1, limit: 15 })).filter((x) => x._id !== currentId);
    clear(side);
    vs.forEach((x) => side.append(videoRow(x, { compact: true })));
  } catch { clear(side); }
}

// ---------- comments ----------
function commentsSection(videoId) {
  const LIMIT = 10;
  let page = 1, done = false, busy = false;
  const list = h("div");
  const more = h("div", { class: "more-wrap" });
  const input = h("textarea", { class: "underline-input", rows: 1, placeholder: "Add a comment…" });
  const actions = h("div", { class: "btn-row hidden" });
  const post = h("button", { class: "pill-btn primary", disabled: true }, "Comment");
  const cancel = h("button", { class: "pill-btn", onclick: () => { input.value = ""; input.rows = 1; actions.classList.add("hidden"); } }, "Cancel");
  actions.append(cancel, post);
  input.addEventListener("focus", () => { actions.classList.remove("hidden"); input.rows = 2; });
  input.addEventListener("input", () => (post.disabled = !input.value.trim()));
  post.onclick = async () => {
    post.disabled = true;
    try {
      const c = (await api.addComment(videoId, input.value.trim())).data;
      state.myComments.add(c._id); savePersisted("myComments");
      list.prepend(commentItem(c));
      cancel.click();
    } catch (e) { toast(e.message, "error"); post.disabled = false; }
  };

  async function load() {
    if (busy || done) return; busy = true;
    clear(more).append(spinner());
    try {
      const cs = (await api.comments(videoId, { page, limit: LIMIT })).data || [];
      cs.forEach((c) => list.append(commentItem(c)));
      if (cs.length < LIMIT) done = true; else page++;
      clear(more);
      if (!done) more.append(h("button", { class: "pill-btn", onclick: load }, "Show more comments"));
      if (done && !list.children.length) more.append(h("span", { class: "muted" }, "No comments yet. Be the first!"));
    } catch (e) { clear(more).append(errorBox(e.message, () => { busy = false; load(); })); return; }
    busy = false;
  }
  load();

  return h("section", { class: "comments" }, h("h3", null, "Comments"),
    h("div", { class: "c-form" }, avatar(state.user, 40), h("div", { class: "col" }, input, actions)),
    list, more);
}

function commentItem(c) {
  const mine = state.myComments.has(c._id);
  const body = h("div", { class: "body" }, c.content);
  const likeBtn = h("button", { class: "like-mini" });
  const paint = () => { const on = state.likedComments.has(c._id); likeBtn.className = "like-mini" + (on ? " on" : ""); clear(likeBtn).append(icon("like", { size: 18 }), on ? "Liked" : "Like"); };
  paint();
  likeBtn.onclick = async () => {
    try {
      const r = await api.likeComment(c._id);
      r.data ? state.likedComments.add(c._id) : state.likedComments.delete(c._id);
      savePersisted("likedComments"); paint();
    } catch (e) { toast(e.message, "error"); }
  };
  const acts = h("div", { class: "acts" }, likeBtn);
  const wrap = h("div", { class: "comment" }, avatar(mine ? state.user : null, 40), h("div", { style: { flex: 1, minWidth: 0 } }, mine && h("div", { class: "who" }, "@" + state.user.username), body, acts));

  if (mine) {
    acts.append(
      h("button", { class: "like-mini", onclick: () => startEdit() }, icon("edit", { size: 18 }), "Edit"),
      h("button", { class: "like-mini", onclick: async () => {
        if (!(await confirmDialog({ title: "Delete comment?", message: "This comment will be permanently deleted." }))) return;
        try { await api.deleteComment(c._id); state.myComments.delete(c._id); savePersisted("myComments"); wrap.remove(); } catch (e) { toast(e.message, "error"); }
      } }, icon("trash", { size: 18 }), "Delete"));
  }
  function startEdit() {
    const ta = h("textarea", { class: "underline-input", rows: 2 }); ta.value = c.content;
    const save = h("button", { class: "pill-btn primary", onclick: async () => {
      if (!ta.value.trim()) return;
      try { const u = (await api.updateComment(c._id, ta.value.trim())).data; c.content = u.content; body.textContent = u.content; stop(); } catch (e) { toast(e.message, "error"); }
    } }, "Save");
    const stop = () => { editor.replaceWith(body); acts.classList.remove("hidden"); };
    const editor = h("div", null, ta, h("div", { class: "btn-row" }, h("button", { class: "pill-btn", onclick: stop }, "Cancel"), save));
    body.replaceWith(editor); acts.classList.add("hidden"); ta.focus();
  }
  return wrap;
}

// ---------- modals ----------
function editVideoModal(v, done) {
  const title = h("input", { type: "text", value: v.title });
  const desc = h("textarea"); desc.value = v.description || "";
  const thumb = h("input", { type: "file", accept: "image/*" });
  const err = h("p", { class: "err" });
  const save = h("button", { class: "pill-btn primary" }, "Save");
  const m = modal("Edit video", h("div", null,
    h("div", { class: "field" }, h("label", null, "Title"), title),
    h("div", { class: "field" }, h("label", null, "Description"), desc),
    h("div", { class: "field" }, h("label", null, "New thumbnail"), thumb, h("div", { class: "hint" }, "Optional")),
    err, h("div", { class: "btn-row" }, h("button", { class: "pill-btn", onclick: () => m.close() }, "Cancel"), save)));
  save.onclick = async () => {
    if (!title.value.trim()) { err.textContent = "Title is required"; return; }
    save.disabled = true; save.textContent = "Saving…";
    try {
      const nv = cacheVideo((await api.updateVideo(v._id, { title: title.value.trim(), description: desc.value.trim() || undefined, thumbnail: thumb.files[0] })).data);
      done(nv); m.close(); toast("Video updated");
    } catch (e) { err.textContent = e.message; save.disabled = false; save.textContent = "Save"; }
  };
}

export async function savePlaylistModal(videoId) {
  const listEl = h("div", null, spinner());
  const m = modal("Save to…", h("div", null, listEl));
  const render = async () => {
    try {
      const pls = (await api.userPlaylists(state.user._id)).data || [];
      clear(listEl);
      if (!pls.length) listEl.append(h("p", { class: "muted" }, "You have no playlists yet."));
      pls.forEach((p) => {
        const cb = h("input", { type: "checkbox", checked: (p.videos || []).includes(videoId) });
        cb.onchange = async () => {
          cb.disabled = true;
          try {
            await (cb.checked ? api.addToPlaylist(videoId, p._id) : api.removeFromPlaylist(videoId, p._id));
            toast(cb.checked ? `Added to ${p.name}` : `Removed from ${p.name}`);
          } catch (e) { cb.checked = !cb.checked; toast(e.message, "error"); }
          cb.disabled = false;
        };
        listEl.append(h("label", { class: "check-row" }, cb, h("span", null, p.name)));
      });
    } catch (e) { clear(listEl).append(errorBox(e.message)); }
  };
  render();
  const name = h("input", { type: "text", placeholder: "Playlist name" });
  const desc = h("input", { type: "text", placeholder: "Description" });
  const create = h("button", { class: "pill-btn primary", onclick: async () => {
    if (!name.value.trim() || !desc.value.trim()) return toast("Name and description are required", "error");
    create.disabled = true;
    try {
      const p = (await api.createPlaylist(name.value.trim(), desc.value.trim())).data;
      await api.addToPlaylist(videoId, p._id);
      toast(`Added to ${p.name}`); m.close();
    } catch (e) { toast(e.message, "error"); create.disabled = false; }
  } }, "Create & add");
  m.box.append(h("hr", { style: { border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" } }),
    h("div", { class: "field" }, h("label", null, "New playlist"), name), h("div", { class: "field" }, desc),
    h("div", { class: "btn-row" }, h("button", { class: "pill-btn", onclick: () => m.close() }, "Done"), create));
}
