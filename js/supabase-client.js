import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const STORAGE_KEY = "sb-64fellowship-auth";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: STORAGE_KEY,
  },
});

/** Single shared promise so every page script sees the same auth result. */
let readyPromise = null;

function readLegacySession() {
  // Recover sessions stored under Supabase's default key formats
  const keys = Object.keys(localStorage).filter(
    (key) =>
      key.includes("auth-token") ||
      key.includes("vxqryagqfqsjcwndifvl") ||
      key.startsWith("sb-")
  );

  for (const key of keys) {
    if (key === STORAGE_KEY) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const access_token = parsed?.access_token || parsed?.currentSession?.access_token;
      const refresh_token = parsed?.refresh_token || parsed?.currentSession?.refresh_token;
      if (access_token && refresh_token) {
        return { access_token, refresh_token, sourceKey: key };
      }
    } catch {
      /* ignore bad JSON */
    }
  }
  return null;
}

async function initAuth() {
  // 1) Wait until the client finishes its first auth emission
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        subscription.unsubscribe();
      } catch {
        /* ignore */
      }
      resolve();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") finish();
    });

    setTimeout(finish, 1500);
  });

  // 2) Read session after init
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  // 3) Recover from an older storage key (previous page loads)
  const legacy = readLegacySession();
  if (legacy) {
    const { data, error } = await supabase.auth.setSession({
      access_token: legacy.access_token,
      refresh_token: legacy.refresh_token,
    });
    if (!error && data.session) {
      try {
        localStorage.removeItem(legacy.sourceKey);
      } catch {
        /* ignore */
      }
      return data.session;
    }
  }

  // 4) Last check
  ({
    data: { session },
  } = await supabase.auth.getSession());
  return session ?? null;
}

/**
 * Wait until Supabase finishes restoring the session from storage.
 * Safe to call from multiple modules — result is cached.
 */
export function getSessionWhenReady() {
  if (!readyPromise) {
    readyPromise = initAuth().catch((err) => {
      console.error("Auth init failed:", err);
      readyPromise = null;
      return null;
    });
  }
  return readyPromise;
}

export async function getSession() {
  return getSessionWhenReady();
}

export async function getUser() {
  const session = await getSessionWhenReady();
  return session?.user ?? null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Refresh cached session for other modules on this page
  readyPromise = Promise.resolve(data.session);
  return data;
}

export async function signUp({ email, password, metadata = {} }) {
  const emailRedirectTo = new URL("members.html", window.location.href).href;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: metadata,
    },
  });
  if (error) throw error;
  if (data.session) readyPromise = Promise.resolve(data.session);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  readyPromise = Promise.resolve(null);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function resetPassword(email) {
  const redirectTo = new URL("reset-password.html", window.location.href).href;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}
