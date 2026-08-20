import { supabase } from "./supabase-client.js";

/** Coaching pathway — 7 sequential steps. Members start at 1 of 7 on sign-in. */
export const COACHING_STEPS = [
  {
    id: "begin",
    title: "Begin the pathway",
    description: "Commit to prayer-and-Word-powered coaching as a member.",
  },
  {
    id: "praying-leader",
    title: "The Praying Leader",
    description: "Walk through the flagship coaching orientation for spiritual leadership.",
  },
  {
    id: "conviction",
    title: "Conviction",
    description: "Embrace Scripture-fed, Spirit-led, worship-based prayer priorities.",
  },
  {
    id: "community",
    title: "Community",
    description: "Engage the fellowship of like-minded pastors around Acts 6:4.",
  },
  {
    id: "capacity",
    title: "Capacity",
    description: "Build growing capacity for prayer-and-Word-powered leadership.",
  },
  {
    id: "guideposts",
    title: "Discipleship guideposts",
    description: "Explore Worship-based Prayer, Good Repute, Spirit, and Wisdom guideposts.",
  },
  {
    id: "awakening",
    title: "Toward a 6:7 awakening",
    description: "Carry Acts 6:4 into your church so the Word of God spreads and disciples multiply.",
  },
];

const STORAGE_PREFIX = "64-coaching-progress:";
const TOTAL_STEPS = COACHING_STEPS.length;

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function emptyProgress() {
  return {
    started: false,
    completed: [],
    currentStep: 1,
    updatedAt: null,
  };
}

function normalizeProgress(raw) {
  const completed = Array.isArray(raw?.completed) ? [...new Set(raw.completed)] : [];
  const started = Boolean(raw?.started) || completed.length > 0;
  const completedCount = COACHING_STEPS.filter((step) => completed.includes(step.id)).length;
  const currentStep =
    typeof raw?.currentStep === "number" && raw.currentStep >= 1
      ? Math.min(raw.currentStep, TOTAL_STEPS)
      : started
        ? completedCount >= TOTAL_STEPS
          ? TOTAL_STEPS
          : completedCount + 1
        : 1;

  return {
    started,
    completed,
    currentStep,
    updatedAt: raw?.updatedAt || raw?.updated_at || null,
  };
}

function computeCurrentStep(progress) {
  const completedCount = COACHING_STEPS.filter((step) =>
    progress.completed.includes(step.id)
  ).length;
  if (!progress.started) return 1;
  return completedCount >= TOTAL_STEPS ? TOTAL_STEPS : completedCount + 1;
}

export function loadProgress(userId) {
  if (!userId) return emptyProgress();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

function writeLocal(userId, progress) {
  const next = normalizeProgress({
    ...progress,
    currentStep: computeCurrentStep(progress),
    updatedAt: progress.updatedAt || new Date().toISOString(),
  });
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({
      started: next.started,
      completed: next.completed,
      currentStep: next.currentStep,
      updatedAt: next.updatedAt,
    })
  );
  return next;
}

async function pushRemote(userId, progress) {
  if (!userId) return;
  const next = normalizeProgress(progress);
  const { error } = await supabase.from("coaching_progress").upsert(
    {
      user_id: userId,
      started: next.started,
      completed: next.completed,
      current_step: next.currentStep,
      updated_at: next.updatedAt || new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.warn("Coaching progress sync failed:", error.message);
  }
}

export function saveProgress(userId, progress) {
  if (!userId) return emptyProgress();
  const next = writeLocal(userId, {
    started: Boolean(progress.started),
    completed: [...new Set(progress.completed || [])],
    updatedAt: new Date().toISOString(),
  });
  // Fire-and-forget remote sync; localStorage remains the offline cache
  void pushRemote(userId, next);
  return next;
}

/** Prefer the newer of local vs remote, then keep both in sync. */
export async function hydrateProgress(userId) {
  if (!userId) return emptyProgress();

  const local = loadProgress(userId);
  let remote = null;

  try {
    const { data, error } = await supabase
      .from("coaching_progress")
      .select("started, completed, current_step, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      remote = normalizeProgress({
        started: data.started,
        completed: data.completed,
        currentStep: data.current_step,
        updatedAt: data.updated_at,
      });
    }
  } catch (err) {
    console.warn("Could not load remote coaching progress:", err?.message || err);
    return local;
  }

  if (!remote) {
    if (local.started || local.completed.length) {
      await pushRemote(userId, local);
    }
    return local;
  }

  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;

  if (!local.started && !local.completed.length) {
    return writeLocal(userId, remote);
  }

  if (remoteTime >= localTime) {
    return writeLocal(userId, remote);
  }

  await pushRemote(userId, local);
  return local;
}

/** On sign-in / members load: start every member at step 1 of 7. */
export function ensureStartedAtOne(userId) {
  if (!userId) return emptyProgress();
  const progress = loadProgress(userId);
  if (progress.started) return progress;
  progress.started = true;
  progress.currentStep = 1;
  return saveProgress(userId, progress);
}

export async function ensureStartedAtOneAsync(userId) {
  await hydrateProgress(userId);
  return ensureStartedAtOne(userId);
}

export function getProgressStats(userId) {
  const progress = loadProgress(userId);
  const total = TOTAL_STEPS;
  const completedCount = COACHING_STEPS.filter((step) =>
    progress.completed.includes(step.id)
  ).length;

  if (!progress.started) {
    return {
      progress,
      total,
      completedCount: 0,
      currentStep: 1,
      percent: Math.round((1 / total) * 100),
      hasData: false,
      nextStep: COACHING_STEPS[0],
    };
  }

  const currentStep = completedCount >= total ? total : completedCount + 1;
  const percent = Math.round((currentStep / total) * 100);
  const nextStep = COACHING_STEPS.find((step) => !progress.completed.includes(step.id)) || null;

  return {
    progress,
    total,
    completedCount,
    currentStep,
    percent,
    hasData: true,
    nextStep,
  };
}

/** Complete a step only if prior steps are done (sequential pathway). */
export function completeStep(userId, stepId) {
  const progress = loadProgress(userId);
  const index = COACHING_STEPS.findIndex((step) => step.id === stepId);
  if (index === -1) {
    throw new Error("Unknown coaching step.");
  }

  for (let i = 0; i < index; i += 1) {
    if (!progress.completed.includes(COACHING_STEPS[i].id)) {
      throw new Error(`Complete “${COACHING_STEPS[i].title}” first.`);
    }
  }

  if (!progress.completed.includes(stepId)) {
    progress.completed.push(stepId);
  }
  progress.started = true;
  return saveProgress(userId, progress);
}

export function startPathway(userId) {
  return ensureStartedAtOne(userId);
}

export function isStepComplete(userId, stepId) {
  return loadProgress(userId).completed.includes(stepId);
}

export function isStepUnlocked(userId, stepId) {
  const index = COACHING_STEPS.findIndex((step) => step.id === stepId);
  if (index <= 0) return true;
  const progress = loadProgress(userId);
  return progress.completed.includes(COACHING_STEPS[index - 1].id);
}
