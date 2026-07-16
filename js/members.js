import { getSessionWhenReady, signOut } from "./supabase-client.js";
import { getProgressStats, COACHING_STEPS } from "./coaching-progress.js";

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

  if (!stats.hasData) {
    if (emptyEl) emptyEl.hidden = false;
    if (activeEl) activeEl.hidden = true;
    if (barEl) {
      barEl.setAttribute("aria-valuenow", "0");
      barEl.classList.add("is-empty");
    }
    if (fillEl) fillEl.style.width = "0%";
    if (percentEl) percentEl.textContent = "—";
    if (metaEl) metaEl.textContent = "No coaching data yet";
    if (stepsEl) stepsEl.innerHTML = "";
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (activeEl) activeEl.hidden = false;
  if (barEl) {
    barEl.setAttribute("aria-valuenow", String(stats.percent));
    barEl.classList.remove("is-empty");
  }
  if (fillEl) fillEl.style.width = `${stats.percent}%`;
  if (percentEl) percentEl.textContent = `${stats.percent}%`;
  if (metaEl) {
    metaEl.textContent = `${stats.completedCount} of ${stats.total} coaching steps complete`;
  }

  if (stepsEl) {
    stepsEl.innerHTML = COACHING_STEPS.map((step) => {
      const done = stats.progress.completed.includes(step.id);
      return `
        <li class="member-step ${done ? "is-done" : ""}">
          <span class="member-step__mark" aria-hidden="true">${done ? "✓" : "○"}</span>
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
