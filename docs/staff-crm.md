# Members CRM (private URL)

Unlisted staff page — **not linked in the site nav**. Open it only by URL:

https://6-4-fellowship.vercel.app/crm.html

(`noindex` is set so search engines should skip it.)

## Required: create the member tables (one paste)

Until this runs, the CRM cannot show anyone (`profiles` does not exist yet).

1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the full contents of [`supabase/SETUP_MEMBERS_CRM.sql`](../supabase/SETUP_MEMBERS_CRM.sql)
3. Click **Run**
4. Refresh `/crm.html`

That script creates `profiles` + `coaching_progress`, backfills existing Auth users, and auto-adds new joins.
