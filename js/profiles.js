import { supabase } from "./supabase-client.js";

/** Staff check: set in Supabase Auth → user → App Metadata as { "role": "admin" }. */
export function isAdmin(user) {
  return user?.app_metadata?.role === "admin";
}

export function profilePayloadFromUser(user) {
  if (!user?.id) return null;
  const meta = user.user_metadata || {};
  const first = (meta.first_name || "").trim();
  const last = (meta.last_name || "").trim();
  const full =
    (meta.full_name || "").trim() ||
    [first, last].filter(Boolean).join(" ").trim() ||
    (meta.name || "").trim() ||
    null;

  let role = meta.role || null;
  if (role && role !== "pastor" && role !== "disciple") role = null;

  return {
    id: user.id,
    email: user.email || null,
    first_name: first || null,
    last_name: last || null,
    full_name: full,
    church: (meta.church || "").trim() || null,
    role,
    updated_at: new Date().toISOString(),
  };
}

/** Upsert the signed-in user's profile row from auth metadata. */
export async function upsertProfileFromUser(user) {
  const payload = profilePayloadFromUser(user);
  if (!payload) return null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) {
    console.warn("Profile upsert failed:", error.message);
    return null;
  }
  return data;
}

export async function syncProfileFromSession(session) {
  if (!session?.user) return null;
  return upsertProfileFromUser(session.user);
}
