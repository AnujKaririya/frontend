import { h, toast } from "../util.js";
import { api } from "../api.js";
import { setUser, loadLikedVideos } from "../store.js";

export async function doLogin(identity, password) {
  const id = identity.trim();
  const body = id.includes("@") ? { email: id, password } : { username: id.toLowerCase(), password };
  const r = await api.login(body);
  setUser(r.data.user, r.data.accessToken);
  return r.data.user;
}

function field(label, input, hint) {
  return h("div", { class: "field" }, h("label", null, label), input, hint && h("div", { class: "hint" }, hint));
}

export function loginPage() {
  const err = h("p", { class: "err" });
  const idIn = h("input", { type: "text", required: true, autocomplete: "username" });
  const pwIn = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const btn = h("button", { class: "pill-btn primary", type: "submit" }, "Sign in");
  const form = h("form", { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ""; btn.disabled = true;
    try { await doLogin(idIn.value, pwIn.value); location.hash = "#/"; location.reload(); }
    catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  } },
    field("Username or email", idIn), field("Password", pwIn), err,
    h("div", { class: "form-actions" }, h("a", { class: "link", href: "#/register" }, "Create account"), btn));
  return h("div", { class: "auth-card" }, h("h1", null, "Sign in"), h("p", { class: "muted", style: { marginTop: 0 } }, "to continue"), form);
}

export function registerPage() {
  const err = h("p", { class: "err" });
  const f = {
    fullName: h("input", { type: "text", required: true, autocomplete: "name" }),
    username: h("input", { type: "text", required: true, autocomplete: "username" }),
    email: h("input", { type: "email", required: true, autocomplete: "email" }),
    password: h("input", { type: "password", required: true, autocomplete: "new-password", minlength: 6 }),
    avatar: h("input", { type: "file", accept: "image/*", required: true }),
    coverImage: h("input", { type: "file", accept: "image/*" }),
  };
  const btn = h("button", { class: "pill-btn primary", type: "submit" }, "Create account");
  const form = h("form", { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ""; btn.disabled = true; btn.textContent = "Creating…";
    try {
      await api.register({
        fullName: f.fullName.value.trim(), username: f.username.value.trim(), email: f.email.value.trim(),
        password: f.password.value, avatar: f.avatar.files[0], coverImage: f.coverImage.files[0],
      });
      await doLogin(f.username.value, f.password.value);
      toast("Welcome!"); location.hash = "#/"; location.reload();
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = "Create account"; }
  } },
    field("Full name", f.fullName), field("Username", f.username), field("Email", f.email), field("Password", f.password),
    field("Avatar", f.avatar, "Required"), field("Cover image", f.coverImage, "Optional"), err,
    h("div", { class: "form-actions" }, h("a", { class: "link", href: "#/login" }, "Sign in instead"), btn));
  return h("div", { class: "auth-card" }, h("h1", null, "Create your account"), form);
}
