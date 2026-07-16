import { getSessionWhenReady } from "./supabase-client.js";
import {
  COACHING_STEPS,
  getProgressStats,
  completeStep,
  isStepComplete,
  isStepUnlocked,
} from "./coaching-progress.js";

const listEl = document.getElementById("coaching-pathway-list");
const statusEl = document.getElementById("coaching-pathway-status");
const gateEl = document.getElementById("coaching-pathway-gate");
const trackEl = document.getElementById("coaching-pathway-track");
const signedInAsEl = document.getElementById("coaching-signed-in-as");
const guestCta = document.getElementById("coaching-cta-guest");
const memberCta = document.getElementById("coaching-cta-member");

let userId = null;

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
  if (hidden) {
    el.setAttribute("hidden", "");
    el.style.display = "none";
  } else {
    el.removeAttribute("hidden");
    el.style.display = "";
  }
}

function showGate() {
  setHidden(gateEl, false);
  setHidden(trackEl, true);
  setHidden(guestCta, false);
  setHidden(memberCta, true);
}

function showTrack(email) {
  setHidden(gateEl, true);
  setHidden(trackEl, false);
  setHidden(guestCta, true);
  setHidden(memberCta, false);
  if (signedInAsEl) {
    setHidden(signedInAsEl, false);
    signedInAsEl.textContent = `Signed in as ${email}`;
  }
}

function render() {
  if (!listEl || !userId) return;

  const stats = getProgressStats(userId);

  if (statusEl) {
    if (!stats.hasData) {
      statusEl.textContent = "Start step 1 to begin tracking progress on your member page.";
    } else {
      statusEl.textContent = `${stats.completedCount} of ${stats.total} steps complete (${stats.percent}%).`;
    }
  }

  listEl.innerHTML = COACHING_STEPS.map((step, index) => {
    const done = isStepComplete(userId, step.id);
    const unlocked = isStepUnlocked(userId, step.id);
    const locked = !unlocked;

    let action = "";
    if (done) {
      action = `<span class="pathway-step__badge pathway-step__badge--done">Completed</span>`;
    } else if (locked) {
      action = `<span class="pathway-step__badge">Locked</span>`;
    } else {
      action = `<button type="button" class="btn btn--primary pathway-step__btn" data-complete="${step.id}">Mark complete</button>`;
    }

    return `
      <li class="pathway-step ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}" data-step="${step.id}">
        <div class="pathway-step__index">${String(index + 1).padStart(2, "0")}</div>
        <div class="pathway-step__body">
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </div>
        <div class="pathway-step__action">${action}</div>
      </li>
    `;
  }).join("");

  listEl.querySelectorAll("[data-complete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        completeStep(userId, btn.getAttribute("data-complete"));
        render();
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message;
      }
    });
  });
}

async function init() {
  if (statusEl) statusEl.textContent = "Checking your sign-in…";

  // Default: keep both pathway panels hidden until we know auth state
  if (gateEl) gateEl.hidden = true;
  if (trackEl) trackEl.hidden = true;

  try {
    const session = await getSessionWhenReady();

    if (!session?.user) {
      showGate();
      if (statusEl) statusEl.textContent = "";
      return;
    }

    userId = session.user.id;
    showTrack(session.user.email || "your account");
    render();
  } catch (err) {
    console.error("Coaching auth check failed:", err);
    showGate();
  }
}

init();
