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

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function emptyProgress() {
  return {
    started: false,
    completed: [],
    updatedAt: null,
  };
}

export function loadProgress(userId) {
  if (!userId) return emptyProgress();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return {
      started: Boolean(parsed.started),
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(userId, progress) {
  if (!userId) return;
  const next = {
    started: Boolean(progress.started),
    completed: [...new Set(progress.completed)],
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

/** On sign-in / members load: start every member at step 1 of 7. */
export function ensureStartedAtOne(userId) {
  if (!userId) return emptyProgress();
  const progress = loadProgress(userId);
  if (progress.started) return progress;
  progress.started = true;
  return saveProgress(userId, progress);
}

export function getProgressStats(userId) {
  const progress = loadProgress(userId);
  const total = COACHING_STEPS.length;
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
