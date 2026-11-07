import { h, viewsLabel, timeAgo, fmtDuration, secure } from "./util.js";
import { icon } from "./icons.js";
import { state, ownerOf, isMe } from "./store.js";

export const channelHref = (id) => {
  const o = ownerOf(id);
  return o?.username ? `#/channel/${o.username}` : `#/user/${id}`;
};

export function avatar(profile, size = 40) {
  const s = { width: size + "px", height: size + "px", fontSize: Math.round(size * 0.42) + "px" };
  if (profile?.avatar) return h("img", { class: "avatar", src: secure(profile.avatar), alt: "", style: s });
  const name = profile?.fullName || profile?.username;
  return h("span", { class: "avatar", style: s }, name ? name[0].toUpperCase() : icon("user", { size: Math.round(size * 0.6) }));
}
export const ownerName = (id) => { const o = ownerOf(id); return o ? (o.fullName || o.username) : "Channel"; };

export function videoCard(v) {
  const href = `#/watch/${v._id}`;
  return h("article", { class: "vcard" },
    h("a", { class: "thumb", href }, h("img", { src: secure(v.thumbnail), loading: "lazy", alt: "" }), h("span", { class: "dur" }, fmtDuration(v.duration))),
    h("div", { class: "vmeta" },
      h("a", { href: channelHref(v.owner) }, avatar(ownerOf(v.owner), 36)),
      h("div", { class: "vtext" },
        h("a", { class: "vtitle", href, title: v.title }, v.title),
        h("a", { class: "vchan", href: channelHref(v.owner) }, ownerName(v.owner)),
        h("div", { class: "vsub" }, `${viewsLabel(v.views)} · ${timeAgo(v.createdAt)}`))));
}

export function videoRow(v, { compact = false, actions = null } = {}) {
  const href = `#/watch/${v._id}`;
  return h("article", { class: "vrow" + (compact ? " compact" : "") },
    h("a", { class: "thumb", href }, h("img", { src: secure(v.thumbnail), loading: "lazy", alt: "" }), h("span", { class: "dur" }, fmtDuration(v.duration))),
    h("div", { class: "vtext" },
      h("a", { class: "vtitle", href, title: v.title }, v.title),
      h("div", { class: "vsub" }, `${viewsLabel(v.views)} · ${timeAgo(v.createdAt)}`),
      h("a", { class: "vchan", href: channelHref(v.owner) }, ownerName(v.owner)),
      !compact && v.description && h("div", { class: "desc" }, v.description)),
    actions && h("div", { class: "row-actions" }, actions));
}

export const unavailableRow = (label = "Video unavailable") =>
  h("article", { class: "vrow gone" }, h("div", { class: "thumb" }, icon("video")), h("div", { class: "vtext" }, h("div", { class: "vtitle muted" }, label)));

export function emptyState(iconName, title, text) {
  return h("div", { class: "empty" }, icon(iconName, { size: 64 }), h("h3", null, title), text && h("p", null, text));
}

export function skeletonGrid(n = 8) {
  return h("div", { class: "grid" }, Array.from({ length: n }, () =>
    h("div", null, h("div", { class: "skeleton", style: { aspectRatio: "16/9" } }), h("div", { class: "skeleton", style: { height: "16px", marginTop: "12px", width: "80%" } }), h("div", { class: "skeleton", style: { height: "14px", marginTop: "8px", width: "50%" } }))));
}

// Subscribe button. The API has no "am I subscribed?" endpoint, so we derive it from the channel's subscriber list.
import { api } from "./api.js";
import { toast, fmtCount } from "./util.js";
import { loadSubs } from "./store.js";
export function subscribeControl(channelId, { onCount } = {}) {
  if (isMe(channelId)) return h("a", { class: "pill-btn", href: "#/studio", style: { marginLeft: "12px" } }, "Manage videos");
  const btn = h("button", { class: "sub-btn", disabled: true }, "Subscribe");
  let on = false, busy = false, names = [];
  const paint = () => { btn.className = "sub-btn" + (on ? " on" : ""); btn.textContent = on ? "Subscribed" : "Subscribe"; btn.disabled = busy; onCount?.(names.length); };
  const refresh = async () => {
    const r = await api.subscribers(channelId);
    names = [...new Set(r.data?.usernameList || [])];
    on = names.includes(state.user.username);
    busy = false; paint();
  };
  refresh().catch(() => { busy = false; btn.disabled = false; btn.textContent = "Subscribe"; });
  btn.addEventListener("click", async () => {
    busy = true; paint();
    try {
      await api.setSubscription(channelId, !on);
      await refresh();
      loadSubs().then(() => window.dispatchEvent(new Event("subs-changed"))).catch(() => {});
      toast(on ? "Subscribed" : "Unsubscribed");
    } catch (e) { busy = false; paint(); toast(e.message, "error"); }
  });
  return btn;
}
export { fmtCount };
