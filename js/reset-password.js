import { supabase, updatePassword } from "./supabase-client.js";

const form = document.getElementById("reset-form");
const note = form?.querySelector(".form-note");
const submitBtn = form?.querySelector('button[type="submit"]');

function setNote(message, isError = false) {
  if (!note) return;
  note.textContent = message;
  note.style.color = isError ? "#7a1600" : "";
}

// Supabase puts tokens in the URL hash after the email link redirect
supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    setNote("Link verified. Enter your new password below.");
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = form.password.value;
  const confirm = form.confirm.value;

  if (password.length < 8) {
    setNote("Password must be at least 8 characters.", true);
    return;
  }

  if (password !== confirm) {
    setNote("Passwords do not match.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating…";
  setNote("Saving your new password…");

  try {
    await updatePassword(password);
    setNote("Password updated. Redirecting to members…");
    window.location.href = "members.html";
  } catch (err) {
    setNote(
      err?.message ||
        "Could not update password. Request a new reset link from the login page.",
      true
    );
    submitBtn.disabled = false;
    submitBtn.textContent = "Update Password";
  }
});
