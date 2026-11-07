import { h, clear, spinner, errorBox, escapeRegex } from "../util.js";
import { listVideos } from "../store.js";
import { videoCard, videoRow, emptyState, skeletonGrid } from "../components.js";

const SORTS = [
  { label: "Latest", sortBy: "createdAt", sortType: "desc" },
  { label: "Popular", sortBy: "views", sortType: "desc" },
  { label: "Oldest", sortBy: "createdAt", sortType: "asc" },
];

// Shared by Home (grid) and Search results (list). Infinite scroll over getAllVideos.
function feed({ query = "", layout = "grid" }) {
  const root = h("div");
  let sort = SORTS[0], page = 1, done = false, busy = false, observer;
  const items = layout === "grid" ? h("div", { class: "grid" }) : h("div", { class: "list-wrap" });
  const foot = h("div", { class: "sentinel" });
  const chips = h("div", { class: "chips" }, SORTS.map((s) =>
    h("button", { class: "chip" + (s === sort ? " active" : ""), onclick: (e) => { sort = s; [...chips.children].forEach((c) => c.classList.toggle("active", c === e.currentTarget)); reset(); } }, s.label)));
  const status = h("div");
  const LIMIT = 12;

  async function more() {
    if (busy || done) return;
    busy = true; clear(status).append(spinner());
    try {
      const vs = await listVideos({ page, limit: LIMIT, query: escapeRegex(query), sortBy: sort.sortBy, sortType: sort.sortType });
      vs.forEach((v) => items.append(layout === "grid" ? videoCard(v) : videoRow(v)));
      if (vs.length < LIMIT) done = true; else page++;
      clear(status);
      if (!items.children.length) status.append(emptyState("video", query ? "No results found" : "No videos yet", query ? "Try different keywords." : "Videos you publish will show up here."));
    } catch (e) { clear(status).append(errorBox(e.message, () => { busy = false; more(); })); return; }
    busy = false;
    if (!done && foot.getBoundingClientRect().top < innerHeight + 200) more();
  }
  function reset() { page = 1; done = false; clear(items); clear(status); more(); }

  observer = new IntersectionObserver((es) => es[0].isIntersecting && more(), { rootMargin: "400px" });
  observer.observe(foot);
  root.append(chips, items, status, foot);
  more();
  root._cleanup = () => observer.disconnect();
  return root;
}

export function homePage() { return feed({ layout: "grid" }); }
export function searchPage({ query }) {
  const q = (query.q || "").trim();
  const root = h("div", null, h("h2", { class: "page-title", style: { fontSize: "18px" } }, q ? `Results for “${q}”` : "All videos"), feed({ query: q, layout: "list" }));
  root._cleanup = () => root.querySelectorAll("div").forEach((d) => d._cleanup?.());
  return root;
}
