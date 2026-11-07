import { h, clear, append, spinner, errorBox, toast } from "./util.js";
import { icon } from "./icons.js";
import { api, setUnauthorizedHandler } from "./api.js";
import { state, setUser, clearSession, loadLikedVideos, loadSubs } from "./store.js";
import { avatar } from "./components.js";
import { loginPage, registerPage } from "./pages/auth.js";
import { homePage, searchPage } from "./pages/home.js";
import { watchPage } from "./pages/watch.js";
import { channelPage, userPage } from "./pages/channel.js";
import { historyPage, likedPage, subscriptionsPage, playlistsPage, playlistPage } from "./pages/library.js";
import { studioPage, uploadPage } from "./pages/studio.js";
import { settingsPage } from "./pages/settings.js";

const routes = [
  ["/", homePage], ["/search", searchPage], ["/watch/:id", watchPage],
  ["/channel/:username", channelPage], ["/channel/:username/:tab", channelPage], ["/user/:id", userPage],
  ["/history", historyPage], ["/liked", likedPage], ["/subscriptions", subscriptionsPage],
  ["/playlists", playlistsPage], ["/playlist/:id", playlistPage],
  ["/studio", studioPage], ["/upload", uploadPage], ["/settings", settingsPage],
  ["/login", loginPage, { public: true }], ["/register", registerPage, { public: true }],
];
const compiled = routes.map(([path, fn, opts]) => ({ fn, opts: opts || {}, keys: [...path.matchAll(/:(\w+)/g)].map((m) => m[1]), re: new RegExp("^" + path.replace(/:\w+/g, "([^/]+)") + "$") }));

function match(hash) {
  const [path, qs] = (hash.replace(/^#/, "") || "/").split("?");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  for (const r of compiled) {
    const m = r.re.exec(path);
    if (m) return { r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query, path };
  }
  return { r: null, path, query, params: {} };
}

const root = document.getElementById("root");
const main = h("main", { class: "main" });
let headerEl, sidebarEl, scrim, searchInput, navToken = 0, currentPage = null;

// ---------- shell ----------
function buildShell() {
  const q = h("input", { type: "search", placeholder: "Search", "aria-label": "Search" });
  const form = h("form", { class: "search", onsubmit: (e) => { e.preventDefault(); const v = q.value.trim(); location.hash = v ? `#/search?q=${encodeURIComponent(v)}` : "#/"; form.classList.remove("open"); } },
    q, h("button", { type: "submit", "aria-label": "Search" }, icon("search", { size: 20 })));
  const menuBtn = h("button", { class: "icon-btn", id: "menu-btn", "aria-label": "Menu", onclick: toggleSidebar }, icon("menu"));
  headerEl = h("header", { class: "header" },
    h("div", { class: "left" }, menuBtn, h("a", { class: "logo", href: "#/" }, h("span", { class: "logo-mark" }), "Vidly")),
    form,
    h("div", { class: "right" },
      h("button", { class: "icon-btn m-search", "aria-label": "Search", onclick: () => { form.classList.add("open"); q.focus(); } }, icon("search")),
      state.user && h("a", { class: "pill-btn create", href: "#/upload" }, icon("plus", { size: 20 }), h("span", { class: "lbl" }, "Create")),
      state.user && h("button", { class: "avatar-btn", "aria-label": "Account", onclick: (e) => { e.stopPropagation(); accountMenu(); } }, avatar(state.user, 32))));
  sidebarEl = h("nav", { class: "sidebar" });
  scrim = h("div", { class: "scrim hidden", onclick: closeDrawer });
  root.append(headerEl, sidebarEl, scrim, main);
  paintSidebar();
  searchInput = q;
}
const isMobile = () => matchMedia("(max-width: 700px)").matches;
function toggleSidebar() {
  const b = document.body;
  if (b.classList.contains("watch-page") || isMobile()) {
    const open = !b.classList.contains(b.classList.contains("watch-page") ? "drawer-open" : "side-open");
    b.classList.toggle("drawer-open", open && b.classList.contains("watch-page"));
    b.classList.toggle("side-open", open && !b.classList.contains("watch-page"));
    scrim.classList.toggle("hidden", !open);
  } else if (matchMedia("(max-width: 1100px)").matches) {
    b.classList.toggle("side-open"); // expand the mini rail
  } else b.classList.toggle("side-mini");
}
function closeDrawer() { document.body.classList.remove("drawer-open"); if (isMobile()) document.body.classList.remove("side-open"); scrim.classList.add("hidden"); }

function paintSidebar() {
  if (!sidebarEl) return;
  const cur = location.hash.replace(/^#/, "").split("?")[0] || "/";
  const link = (href, ic, label, extra) => h("a", { class: "side-link" + (cur === href.slice(1) ? " active" : ""), href }, extra || icon(ic), h("span", { class: "t" }, label));
  append(clear(sidebarEl), [
    link("#/", "home", "Home"), link("#/subscriptions", "subs", "Subscriptions"),
    h("div", { class: "side-sep" }), h("div", { class: "side-title" }, "You"),
    state.user && link(`#/channel/${state.user.username}`, "user", "Your channel"),
    link("#/history", "history", "History"), link("#/playlists", "playlist", "Playlists"),
    link("#/studio", "studio", "Your videos"), link("#/liked", "like", "Liked videos"),
    state.subs.length ? h("div", { class: "side-extra" }, h("div", { class: "side-sep" }), h("div", { class: "side-title" }, "Subscriptions"),
      state.subs.map((s) => link(`#/channel/${s.username}`, "", s.fullName, avatar(s, 24)))) : null]);
}
window.addEventListener("subs-changed", paintSidebar);

function accountMenu() {
  document.querySelector(".popover")?.remove();
  const u = state.user;
  const item = (ic, label, onclick) => h("button", { class: "menu-item", onclick: () => { pop.remove(); onclick(); } }, icon(ic, { size: 20 }), label);
  const pop = h("div", { class: "popover", onclick: (e) => e.stopPropagation() },
    h("div", { class: "who" }, avatar(u, 40), h("div", null, h("b", null, u.fullName), h("span", { class: "muted" }, "@" + u.username))),
    item("user", "Your channel", () => (location.hash = `#/channel/${u.username}`)),
    item("studio", "Your videos", () => (location.hash = "#/studio")),
    item("settings", "Settings", () => (location.hash = "#/settings")),
    item("logout", "Sign out", signOut));
  document.body.append(pop);
  setTimeout(() => document.addEventListener("click", () => pop.remove(), { once: true }));
}

async function signOut() {
  try { await api.logout(); } catch {}
  clearSession(); location.hash = "#/login"; location.reload();
}
setUnauthorizedHandler(() => { if (state.user) { clearSession(); toast("Your session expired. Please sign in again.", "error"); location.hash = "#/login"; setTimeout(() => location.reload(), 600); } });

// ---------- router ----------
async function navigate() {
  const token = ++navToken;
  closeDrawer();
  document.querySelector(".popover")?.remove();
  currentPage?._cleanup?.(); currentPage = null;
  const { r, params, query, path } = match(location.hash);
  if (searchInput) searchInput.value = path === "/search" ? query.q || "" : "";
  const authPage = r?.opts.public;
  if (!state.user && !authPage) { location.replace("#/login"); return; }
  if (state.user && authPage) { location.replace("#/"); return; }
  document.body.classList.toggle("auth-page", !!authPage);
  document.body.classList.toggle("watch-page", path.startsWith("/watch/"));
  paintSidebar();
  window.scrollTo(0, 0);
  clear(main);
  if (!r) { main.append(h("div", { class: "empty" }, h("h3", null, "Page not found"), h("a", { class: "pill-btn primary", href: "#/" }, "Go home"))); return; }
  main.append(spinner());
  try {
    const el = await r.fn({ params, query });
    if (token !== navToken) { el?._cleanup?.(); return; } // user navigated away meanwhile
    clear(main).append(el);
    currentPage = el;
  } catch (e) {
    if (token !== navToken) return;
    clear(main).append(errorBox(e.message, navigate));
  }
}

// ---------- boot ----------
async function boot() {
  if (state.user) setUser(state.user); // re-hydrate caches/persisted sets
  buildShell();
  api.health().catch(() => root.append(h("div", { class: "banner" }, "Can't reach the backend. Check that it is running and BACKEND_URL points to it.")));
  if (state.user) {
    loadLikedVideos().catch(() => {});
    loadSubs().then(paintSidebar).catch(() => {});
  }
  window.addEventListener("hashchange", () => { navigate(); });
  navigate();
}
boot();
