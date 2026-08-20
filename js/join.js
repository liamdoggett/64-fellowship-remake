import { signUp } from "./supabase-client.js";
import { upsertProfileFromUser } from "./profiles.js";
import { ensureStartedAtOne } from "./coaching-progress.js";

const form = document.getElementById("join-form");
const note = form?.querySelector(".form-note");
const submitBtn = form?.querySelector('button[type="submit"]');

function setNote(message, isError = false) {
  if (!note) return;
  note.innerHTML = message;
  note.style.color = isError ? "#7a1600" : "";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();

  const first = form.first.value.trim();
  const last = form.last.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const church = form.church.value.trim();
  const role = form.role.value;
  const message = form.message.value.trim();

  if (password.length < 8) {
    setNote("Password must be at least 8 characters.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";
  setNote("Creating your member account…");

  try {
    const data = await signUp({
      email,
      password,
      metadata: {
        first_name: first,
        last_name: last,
        full_name: `${first} ${last}`.trim(),
        church,
        role,
        message,
      },
    });

    // Supabase may return a user with empty identities if email already exists
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setNote(
        'An account with this email may already exist. Try <a href="login.html">signing in</a> or resetting your password.',
        true
      );
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
      return;
    }

    if (data.session?.user) {
      await upsertProfileFromUser(data.session.user);
      ensureStartedAtOne(data.session.user.id);
      setNote("Account created. Redirecting…");
      window.location.href = "members.html";
      return;
    }

    setNote(
      "Account created. Check your email to confirm, then <a href=\"login.html\">sign in</a>. You should also see the user under Authentication → Users in Supabase."
    );
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  } catch (err) {
    setNote(err?.message || "Could not create account. Try again.", true);
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});
