import { h, clear, toast, confirmDialog, fmtCount, secure, spinner, errorBox } from "../util.js";
import { icon } from "../icons.js";
import { api } from "../api.js";
import { state, ownerOf, rememberOwner, isMe, allVideos, ensureVideos, savePersisted } from "../store.js";
import { avatar, subscribeControl, videoCard, emptyState } from "../components.js";

// #/channel/:username  -> full profile (the only endpoint that returns avatar/cover/name)
export async function channelPage({ params }) {
  const r = await api.channelProfile(params.username);
  const profile = r.data[0];
  rememberOwner(profile);
  return buildChannel(profile._id, profile, params.tab);
}
// #/user/:id -> we only know the id (e.g. from a video's owner). Use the profile if we've seen it before.
export async function userPage({ params }) {
  const known = ownerOf(params.id);
  if (known?.username) { location.replace(`#/channel/${known.username}`); return h("div"); }
  return buildChannel(params.id, null);
}

function buildChannel(id, profile, tab = "videos") {
  const subCount = h("span", null);
  const name = profile?.fullName || "Channel";
  const sub = subscribeControl(id, { onCount: (n) => (subCount.textContent = `${fmtCount(n)} subscriber${n === 1 ? "" : "s"}`) });
  const body = h("div");
  const base = profile ? `#/channel/${profile.username}` : `#/user/${id}`;
  const tabs = [["videos", "Videos"], ["playlists", "Playlists"], ["posts", "Community"]];
  const tabBar = h("div", { class: "tabs" }, tabs.map(([k, label]) => h("button", { class: "tab" + (k === tab ? " active" : ""), onclick: (e) => {
    [...tabBar.children].forEach((c) => c.classList.remove("active")); e.currentTarget.classList.add("active"); show(k);
  } }, label)));

  const show = (k) => {
    clear(body).append(spinner());
    const render = { videos: videosTab, playlists: playlistsTab, posts: postsTab }[k];
    render(id).then((el) => clear(body).append(el)).catch((e) => clear(body).append(errorBox(e.message, () => show(k))));
  };
  show(tab);

  const page = h("div", { class: "chan-wrap" },
    h("div", { class: "cover" }, profile?.coverImage && h("img", { src: secure(profile.coverImage), alt: "" })),
    h("div", { class: "chan-head" }, avatar(profile, 128),
      h("div", { class: "info" }, h("h1", null, name),
        h("div", { class: "muted" }, profile && `@${profile.username} · `, subCount),
        sub)),
    tabBar, body);
  document.title = name + " – Vidly";
  page._cleanup = () => (document.title = "Vidly");
  return page;
}

async function videosTab(id) {
  const vs = (await allVideos()).filter((v) => v.owner === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!vs.length) return emptyState("video", "This channel has no videos", isMe(id) ? "Upload one from Studio." : "");
  return h("div", { class: "grid" }, vs.map(videoCard));
}

async function playlistsTab(id) {
  const pls = (await api.userPlaylists(id)).data || [];
  if (!pls.length) return emptyState("playlist", "No playlists", "");
  return playlistGrid(pls);
}

export async function playlistGrid(pls) {
  const firstIds = pls.map((p) => p.videos?.[0]).filter(Boolean);
  await ensureVideos(firstIds).catch(() => {});
  return h("div", { class: "p-grid" }, pls.map((p) => {
    const first = state.videos.get(p.videos?.[0]);
    return h("div", { class: "pcard" },
      h("a", { class: "thumb", href: `#/playlist/${p._id}` },
        first && h("img", { src: secure(first.thumbnail), alt: "", loading: "lazy" }),
        h("div", { class: "count" }, h("b", null, p.videos?.length || 0), icon("playlist"))),
      h("a", { class: "t", href: `#/playlist/${p._id}`, style: { display: "block" } }, p.name),
      h("div", { class: "muted" }, "Playlist"));
  }));
}

// Community posts (the backend calls them tweets)
async function postsTab(id) {
  const tweets = ((await api.userTweets(id)).data || []).slice().reverse();
  const list = h("div");
  const paint = () => { if (!list.children.length) list.append(emptyState("tweet", "No posts yet", "")); };
  const add = (t) => { list.querySelector(".empty")?.remove(); return list.append(postItem(t, id, paint)); };
  const wrap = h("div");
  if (isMe(id)) {
    const ta = h("textarea", { class: "underline-input", rows: 2, placeholder: "Share something with your subscribers…" });
    const btn = h("button", { class: "pill-btn primary", onclick: async () => {
      if (!ta.value.trim()) return;
      btn.disabled = true;
      try { const t = (await api.createTweet(ta.value.trim())).data; ta.value = ""; list.querySelector(".empty")?.remove(); list.prepend(postItem(t, id, paint)); } catch (e) { toast(e.message, "error"); }
      btn.disabled = false;
    } }, "Post");
    wrap.append(h("div", { class: "composer" }, h("div", { style: { display: "flex", gap: "16px" } }, avatar(state.user, 40), h("div", { style: { flex: 1 } }, ta, h("div", { class: "btn-row" }, btn)))));
  }
  wrap.append(list);
  tweets.forEach(add); paint();
  return wrap;
}

function postItem(t, ownerId, onEmpty) {
  const mine = isMe(ownerId);
  const body = h("div", { class: "body" }, t.content);
  const like = h("button", { class: "like-mini" });
  const paint = () => { const on = state.likedTweets.has(t._id); like.className = "like-mini" + (on ? " on" : ""); clear(like).append(icon("like", { size: 18 }), on ? "Liked" : "Like"); };
  paint();
  like.onclick = async () => {
    try { const r = await api.likeTweet(t._id); r.data ? state.likedTweets.add(t._id) : state.likedTweets.delete(t._id); savePersisted("likedTweets"); paint(); }
    catch (e) { toast(e.message, "error"); }
  };
  const acts = h("div", { class: "acts", style: { display: "flex", gap: "4px", marginTop: "8px" } }, like);
  const el = h("div", { class: "post" }, avatar(ownerOf(ownerId), 40), h("div", { style: { flex: 1, minWidth: 0 } }, body, acts));
  if (mine) {
    acts.append(
      h("button", { class: "like-mini", onclick: () => {
        const ta = h("textarea", { class: "underline-input", rows: 2 }); ta.value = t.content;
        const stop = () => { editor.replaceWith(body); acts.classList.remove("hidden"); };
        const editor = h("div", null, ta, h("div", { class: "btn-row" }, h("button", { class: "pill-btn", onclick: stop }, "Cancel"),
          h("button", { class: "pill-btn primary", onclick: async () => {
            if (!ta.value.trim()) return;
            try { const u = (await api.updateTweet(t._id, ta.value.trim())).data; t.content = u.content; body.textContent = u.content; stop(); } catch (e) { toast(e.message, "error"); }
          } }, "Save")));
        body.replaceWith(editor); acts.classList.add("hidden"); ta.focus();
      } }, icon("edit", { size: 18 }), "Edit"),
      h("button", { class: "like-mini", onclick: async () => {
        if (!(await confirmDialog({ title: "Delete post?", message: "This post will be permanently deleted." }))) return;
        try { await api.deleteTweet(t._id); el.remove(); onEmpty(); } catch (e) { toast(e.message, "error"); }
      } }, icon("trash", { size: 18 }), "Delete"));
  }
  return el;
}
