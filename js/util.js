// Tiny DOM helper + formatting utilities.
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (["value", "checked", "disabled", "selected"].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, children);
  return el;
}
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

export function fmtViews(n = 0) {
  n = Number(n) || 0;
  const f = (x, s) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10) + s;
  if (n < 1000) return String(n);
  if (n < 1e6) return f(n / 1e3, "K");
  if (n < 1e9) return f(n / 1e6, "M");
  return f(n / 1e9, "B");
}
export const viewsLabel = (n) => `${fmtViews(n)} view${Number(n) === 1 ? "" : "s"}`;
export function fmtCount(n = 0) { return Number(n || 0).toLocaleString(); }
export function timeAgo(date) {
  if (!date) return "";
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, sec] of units) {
    const v = Math.floor(s / sec);
    if (v >= 1) return `${v} ${name}${v > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
export function fmtDuration(sec = 0) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
  const p = (x) => String(x).padStart(2, "0");
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${mm}:${p(ss)}`;
}
// The backend stores Cloudinary's http:// URLs; upgrade them so they work on https pages.
export const secure = (url) => (url ? url.replace(/^http:\/\/res\.cloudinary\.com/, "https://res.cloudinary.com") : "");
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function toast(msg, type = "info") {
  const t = h("div", { class: "toast " + type }, msg);
  document.getElementById("toasts").append(t);
  setTimeout(() => t.remove(), type === "error" ? 5000 : 3000);
}

export function modal(title, body, { onClose } = {}) {
  const back = h("div", { class: "modal-back" });
  const box = h("div", { class: "modal", role: "dialog" }, title && h("h2", null, title), body);
  back.append(box);
  const close = () => { back.remove(); document.removeEventListener("keydown", esc); onClose?.(); };
  const esc = (e) => e.key === "Escape" && close();
  back.addEventListener("mousedown", (e) => e.target === back && close());
  document.addEventListener("keydown", esc);
  document.body.append(back);
  return { close, box };
}
export function confirmDialog({ title, message, confirmText = "Delete", danger = true }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); m.close(); } };
    const body = h("div", null,
      h("p", { class: "muted", style: { marginTop: 0 } }, message),
      h("div", { class: "btn-row" },
        h("button", { class: "pill-btn", onclick: () => finish(false) }, "Cancel"),
        h("button", { class: "pill-btn " + (danger ? "danger" : "primary"), onclick: () => finish(true) }, confirmText)));
    const m = modal(title, body, { onClose: () => finish(false) });
  });
}
export const spinner = () => h("div", { class: "spinner" });
export function errorBox(message, retry) {
  return h("div", { class: "empty" }, h("h3", null, "Something went wrong"), h("p", null, message),
    retry && h("button", { class: "pill-btn primary", onclick: retry }, "Try again"));
}
export function readDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(v.duration) || 0); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    v.src = url;
  });
}
