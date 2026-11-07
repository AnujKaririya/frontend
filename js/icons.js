// Simple stroke icons (24x24). Trusted static markup only.
const P = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h4v-6h4v6h4V10"/>',
  subs: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M6 4h12M9 6h6"/><path d="M11 12l3 2-3 2z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  playlist: '<path d="M3 6h14M3 11h14M3 16h8"/><path d="M17 14l4 2.5-4 2.5z"/>',
  like: '<path d="M7 11v9H4v-9zM7 11l4-8c1.7 0 2.5 1.2 2.2 2.8L12.8 9H19a2 2 0 0 1 2 2.4l-1.3 6.6a2 2 0 0 1-2 1.6H7"/>',
  studio: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
  save: '<path d="M4 6h12M4 11h12M4 16h7M18 13v6M15 16h6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  tweet: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
export function icon(name, { size = 24, fill = false } = {}) {
  const s = document.createElement("span");
  s.className = "icon" + (fill ? " fill" : "");
  s.style.width = s.style.height = size + "px";
  s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;
  return s;
}
