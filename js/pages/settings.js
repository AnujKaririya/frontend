import { h, toast, secure } from "../util.js";
import { api } from "../api.js";
import { state, setUser } from "../store.js";
import { avatar } from "../components.js";

export function settingsPage() {
  const u = state.user;
  const KEEP = ["_id", "username", "fullName", "email", "avatar", "coverImage"];
  const saveUser = (fresh) => { // never persist refreshToken/password echoed back by the API
    const next = { ...state.user };
    for (const k of KEEP) if (fresh[k] !== undefined) next[k] = fresh[k];
    setUser(next); location.reload();
  };

  const fullName = h("input", { type: "text", value: u.fullName });
  const email = h("input", { type: "email", value: u.email });
  const acctErr = h("p", { class: "err" });
  const acct = h("form", { onsubmit: async (e) => {
    e.preventDefault(); acctErr.textContent = "";
    try { const r = await api.updateAccount({ fullName: fullName.value.trim(), email: email.value.trim() }); toast("Account updated"); saveUser(r.data); }
    catch (ex) { acctErr.textContent = ex.message; }
  } },
    h("div", { class: "field" }, h("label", null, "Full name"), fullName),
    h("div", { class: "field" }, h("label", null, "Email"), email), acctErr,
    h("button", { class: "pill-btn primary", type: "submit" }, "Save changes"));

  const imageForm = (label, kind, preview) => {
    const file = h("input", { type: "file", accept: "image/*", required: true });
    return h("form", { onsubmit: async (e) => {
      e.preventDefault();
      try { const r = await (kind === "avatar" ? api.updateAvatar(file.files[0]) : api.updateCover(file.files[0])); toast(`${label} updated`); saveUser(r.data); }
      catch (ex) { toast(ex.message, "error"); }
    } }, h("div", { class: "preview-row" }, preview, h("div", { class: "field", style: { margin: 0, flex: 1 } }, h("label", null, label), file)),
      h("button", { class: "pill-btn primary", type: "submit" }, `Update ${label.toLowerCase()}`));
  };

  const cur = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const nw = h("input", { type: "password", required: true, autocomplete: "new-password", minlength: 6 });
  const cf = h("input", { type: "password", required: true, autocomplete: "new-password" });
  const pwErr = h("p", { class: "err" });
  const pw = h("form", { onsubmit: async (e) => {
    e.preventDefault(); pwErr.textContent = "";
    if (nw.value !== cf.value) { pwErr.textContent = "New passwords don't match"; return; }
    try { await api.changePassword(cur.value, nw.value); toast("Password changed"); pw.reset(); }
    catch (ex) { pwErr.textContent = ex.message; }
  } },
    h("div", { class: "field" }, h("label", null, "Current password"), cur),
    h("div", { class: "field" }, h("label", null, "New password"), nw),
    h("div", { class: "field" }, h("label", null, "Confirm new password"), cf), pwErr,
    h("button", { class: "pill-btn primary", type: "submit" }, "Change password"));

  return h("div", { class: "form-page" }, h("h1", { class: "page-title" }, "Settings"),
    h("div", { class: "panel" }, h("h2", null, "Account"), acct),
    h("div", { class: "panel" }, h("h2", null, "Profile picture"), imageForm("Avatar", "avatar", avatar(u, 72))),
    h("div", { class: "panel" }, h("h2", null, "Banner image"), imageForm("Cover image", "cover", u.coverImage ? h("img", { class: "cover-prev", src: secure(u.coverImage), alt: "" }) : h("div", { class: "cover-prev" }))),
    h("div", { class: "panel" }, h("h2", null, "Password"), pw));
}
