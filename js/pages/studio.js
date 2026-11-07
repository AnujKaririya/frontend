import { h, clear, toast, confirmDialog, fmtCount, timeAgo, secure, readDuration, fmtDuration } from "../util.js";
import { icon } from "../icons.js";
import { api } from "../api.js";
import { state, ensureVideos, cacheVideo, forgetVideo, resetCatalog } from "../store.js";

const STAT_LABELS = [
  ["totalViews", "Total views"], ["subscribers", "Subscribers"], ["videos", "Videos"],
  ["TotalVideoLikes", "Video likes"], ["TotalcommentLikes", "Comment likes"], ["TotalTweetLikes", "Post likes"],
];

export async function studioPage() {
  const [stats, ids] = await Promise.all([api.stats().then((r) => r.data), api.myVideoIds().then((r) => (r.data || []).map((v) => v._id))]);
  const wrap = h("div");
  wrap.append(h("div", { class: "page-head" }, h("h1", { class: "page-title" }, "Channel dashboard"),
    h("a", { class: "pill-btn primary", href: "#/upload" }, icon("upload", { size: 18 }), "Upload video")),
    h("div", { class: "stats" }, STAT_LABELS.map(([k, l]) => h("div", { class: "stat" }, h("div", { class: "n" }, fmtCount(stats[k])), h("div", { class: "l" }, l)))),
    h("h2", { class: "page-title", style: { fontSize: "18px" } }, "Your videos"));
  if (!ids.length) { wrap.append(h("div", { class: "empty" }, h("h3", null, "No videos uploaded"), h("a", { class: "pill-btn primary", href: "#/upload" }, "Upload video"))); return wrap; }

  await ensureVideos(ids);
  const tbody = h("tbody");
  ids.forEach((id) => tbody.append(row(id)));
  wrap.append(h("div", { class: "table-wrap" }, h("table", null,
    h("thead", null, h("tr", null, ["Video", "Visibility", "Date", "Views", ""].map((t) => h("th", null, t)))), tbody)));
  return wrap;

  function row(id) {
    const tr = h("tr");
    const paint = () => {
      const v = state.videos.get(id);
      const vis = h("button", { class: "vis", title: "Toggle publish status", onclick: async () => {
        try {
          const u = cacheVideo((await api.togglePublish(id)).data);
          resetCatalog(); paint(); toast(u.isPublished ? "Video is now public" : "Video is now unpublished");
        } catch (e) { toast(e.message, "error"); }
      } }, h("span", { class: "switch" + (v?.isPublished !== false ? " on" : "") }), v?.isPublished === false ? "Unpublished" : (v ? "Public" : "Unknown"));
      clear(tr).append(
        h("td", null, v ? h("a", { class: "t-video", href: `#/watch/${id}` }, h("img", { src: secure(v.thumbnail), alt: "" }), h("div", null, h("b", null, v.title), h("div", { class: "muted" }, fmtDuration(v.duration))))
          : h("div", { class: "t-video" }, h("div", { class: "ph" }), h("div", { class: "muted" }, "Details unavailable (unpublished before this browser saw it). Toggle visibility to load."))),
        h("td", null, vis),
        h("td", null, v ? timeAgo(v.createdAt) : "—"),
        h("td", null, v ? fmtCount(v.views) : "—"),
        h("td", null, h("button", { class: "icon-btn", title: "Delete", onclick: async () => {
          if (!(await confirmDialog({ title: "Delete video?", message: `${v ? `“${v.title}”` : "This video"} will be permanently deleted.` }))) return;
          try { await api.deleteVideo(id); forgetVideo(id); tr.remove(); toast("Video deleted"); } catch (e) { toast(e.message, "error"); }
        } }, icon("trash", { size: 20 }))));
    };
    paint();
    return tr;
  }
}

export function uploadPage() {
  const err = h("p", { class: "err" });
  const title = h("input", { type: "text", required: true, maxlength: 100 });
  const desc = h("textarea", { required: true });
  const video = h("input", { type: "file", accept: "video/*", required: true });
  const thumb = h("input", { type: "file", accept: "image/*", required: true });
  const prog = h("i"), progWrap = h("div", { class: "progress hidden" }, prog);
  const status = h("div", { class: "muted", style: { marginTop: "8px" } });
  const btn = h("button", { class: "pill-btn primary", type: "submit" }, icon("upload", { size: 18 }), "Publish");
  video.onchange = () => { if (video.files[0] && !title.value) title.value = video.files[0].name.replace(/\.[^.]+$/, ""); };

  const form = h("form", { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = "";
    if (!title.value.trim() || !desc.value.trim()) { err.textContent = "Title and description are required"; return; }
    btn.disabled = true; progWrap.classList.remove("hidden"); status.textContent = "Uploading…";
    try {
      const duration = await readDuration(video.files[0]); // the API requires a duration
      const r = await api.publish({ title: title.value.trim(), description: desc.value.trim(), duration, videoFile: video.files[0], thumbnail: thumb.files[0] }, (p) => {
        prog.style.width = Math.round(p * 100) + "%";
        status.textContent = p >= 1 ? "Processing… almost done" : `Uploading… ${Math.round(p * 100)}%`;
      });
      cacheVideo(r.data); resetCatalog(); toast("Video published");
      location.hash = `#/watch/${r.data._id}`;
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; progWrap.classList.add("hidden"); status.textContent = ""; }
  } },
    h("div", { class: "field" }, h("label", null, "Video file"), video),
    h("div", { class: "field" }, h("label", null, "Thumbnail"), thumb),
    h("div", { class: "field" }, h("label", null, "Title"), title),
    h("div", { class: "field" }, h("label", null, "Description"), desc),
    err, h("div", { class: "form-actions" }, h("a", { class: "pill-btn", href: "#/studio" }, "Cancel"), btn), progWrap, status);
  return h("div", { class: "form-page" }, h("h1", { class: "page-title" }, "Upload video"), h("div", { class: "panel" }, form));
}
