import { signIn, getSession, resetPassword } from "./supabase-client.js";

const loginView = document.getElementById("login-view");
const forgotView = document.getElementById("forgot-view");
const loginForm = document.getElementById("login-form");
const forgotForm = document.getElementById("forgot-form");
const forgotLink = document.getElementById("forgot-password-link");
const backToLogin = document.getElementById("back-to-login");

const loginNote = loginForm?.querySelector(".form-note");
const forgotNote = forgotForm?.querySelector(".form-note");
const loginSubmit = loginForm?.querySelector('button[type="submit"]');
const forgotSubmit = forgotForm?.querySelector('button[type="submit"]');

function setNote(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#7a1600" : "";
}

function showForgot() {
  if (loginView) loginView.hidden = true;
  if (forgotView) forgotView.hidden = false;

  const email = loginForm?.email?.value?.trim();
  if (email && forgotForm?.email) forgotForm.email.value = email;
  forgotForm?.email?.focus();
}

function showLogin() {
  if (forgotView) forgotView.hidden = true;
  if (loginView) loginView.hidden = false;
  loginForm?.email?.focus();
}

async function redirectIfSignedIn() {
  try {
    const session = await getSession();
    if (session) window.location.href = "members.html";
  } catch {
    /* ignore */
  }
}

redirectIfSignedIn();

forgotLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showForgot();
});

backToLogin?.addEventListener("click", (e) => {
  e.preventDefault();
  showLogin();
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    setNote(loginNote, "Enter your email and password.", true);
    return;
  }

  loginSubmit.disabled = true;
  loginSubmit.textContent = "Signing in…";
  setNote(loginNote, "Checking your credentials…");

  try {
    await signIn(email, password);
    setNote(loginNote, "Signed in. Redirecting…");
    window.location.href = "members.html";
  } catch (err) {
    setNote(loginNote, err?.message || "Sign-in failed. Check your email and password.", true);
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Sign In";
  }
});

forgotForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();

  const email = forgotForm.email.value.trim();
  if (!email) {
    setNote(forgotNote, "Enter the email for your account.", true);
    return;
  }

  forgotSubmit.disabled = true;
  forgotSubmit.textContent = "Sending…";
  setNote(forgotNote, "Sending reset link…");

  try {
    await resetPassword(email);
    setNote(
      forgotNote,
      "If an account exists for that email, a reset link is on its way. Check your inbox (and spam)."
    );
    forgotSubmit.textContent = "Link sent";
  } catch (err) {
    setNote(forgotNote, err?.message || "Could not send reset email. Try again.", true);
    forgotSubmit.disabled = false;
    forgotSubmit.textContent = "Send Reset Link";
  }
});
