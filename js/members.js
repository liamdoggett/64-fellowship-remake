import { getSessionWhenReady, signOut } from "./supabase-client.js";
import { syncProfileFromSession } from "./profiles.js";
import {
  getProgressStats,
  ensureStartedAtOneAsync,
  COACHING_STEPS,
} from "./coaching-progress.js";

const nameEl = document.getElementById("member-name");
const emailEl = document.getElementById("member-email");
const signOutBtn = document.getElementById("sign-out-btn");
const emptyEl = document.getElementById("progress-empty");
const activeEl = document.getElementById("progress-active");
const fillEl = document.getElementById("progress-fill");
const percentEl = document.getElementById("progress-percent");
const metaEl = document.getElementById("progress-meta");
const stepsEl = document.getElementById("progress-steps");
const barEl = document.getElementById("coaching-progress-bar");

function renderProgress(userId) {
  const stats = getProgressStats(userId);

  if (emptyEl) emptyEl.hidden = true;
  if (activeEl) activeEl.hidden = false;
  if (barEl) {
    barEl.setAttribute("aria-valuenow", String(stats.percent));
    barEl.classList.remove("is-empty");
  }
  if (fillEl) fillEl.style.width = `${stats.percent}%`;
  if (percentEl) percentEl.textContent = `${stats.currentStep} / ${stats.total}`;
  if (metaEl) {
    metaEl.textContent = `Step ${stats.currentStep} of ${stats.total}`;
  }

  if (stepsEl) {
    stepsEl.innerHTML = COACHING_STEPS.map((step, index) => {
      const done = stats.progress.completed.includes(step.id);
      const current = !done && index === stats.currentStep - 1;
      return `
        <li class="member-step ${done ? "is-done" : ""} ${current ? "is-current" : ""}">
          <span class="member-step__mark" aria-hidden="true">${done ? "✓" : current ? String(index + 1) : "○"}</span>
          <span>${step.title}</span>
        </li>
      `;
    }).join("");
  }
}

async function init() {
  try {
    const session = await getSessionWhenReady();
    if (!session?.user) {
      window.location.href = "login.html";
      return;
    }

    await syncProfileFromSession(session);
    await ensureStartedAtOneAsync(session.user.id);

    const email = session.user.email || "";
    const metaName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      email.split("@")[0] ||
      "pastor";

    if (nameEl) nameEl.textContent = metaName;
    if (emailEl) emailEl.textContent = email;

    renderProgress(session.user.id);
  } catch {
    window.location.href = "login.html";
  }
}

signOutBtn?.addEventListener("click", async () => {
  try {
    await signOut();
  } finally {
    window.location.href = "login.html";
  }
});

init();
