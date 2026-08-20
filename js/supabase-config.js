/**
 * Browser-safe Supabase config only.
 * Never put SUPABASE_SECRET_KEY here.
 */
export const SUPABASE_URL = "https://vxqryagqfqsjcwndifvl.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_9cvMazAwRPyeNFSuhm6tEQ_TiJjENea";

/** Production site — used for auth email redirects (confirm signup, reset password). */
export const SITE_URL = "https://6-4-fellowship.vercel.app";

/**
 * Prefer the live site for email links so confirmations never go to localhost.
 * Localhost is only used when SITE_URL is unset.
 */
export function authRedirectUrl(path) {
  const base =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? SITE_URL
      : typeof window !== "undefined"
        ? window.location.origin
        : SITE_URL;
  return new URL(path.replace(/^\//, ""), `${base.replace(/\/$/, "")}/`).href;
}
