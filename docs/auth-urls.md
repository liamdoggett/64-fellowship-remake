# Auth email redirects

Confirmation / reset emails must open the **live site**, not localhost.

## Required in Supabase (one-time)

1. Open **Authentication → URL Configuration**
2. Set **Site URL** to:

   `https://6-4-fellowship.vercel.app`

3. Under **Redirect URLs**, add:

   - `https://6-4-fellowship.vercel.app/**`
   - `https://6-4-fellowship.vercel.app/members.html`
   - `https://6-4-fellowship.vercel.app/reset-password.html`

4. Save

If Site URL is still `http://localhost:3000`, approve/confirm links will keep sending people there.

After changing this, use a **new** confirmation email (old links still point at localhost).
