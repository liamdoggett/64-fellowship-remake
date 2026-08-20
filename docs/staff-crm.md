# Members CRM

Open the page at:

- https://6-4-fellowship.vercel.app/crm.html
- https://6-4-fellowship.vercel.app/CRM

(Not `index.html/CRM` — that path is invalid.)

## One-time: apply database migrations

In the Supabase SQL Editor for project `vxqryagqfqsjcwndifvl`, run in order:

1. `supabase/migrations/20260820145837_profiles_and_coaching_progress.sql`
2. `supabase/migrations/20260820154500_crm_public_read.sql`

The second migration lets the CRM load member rows without signing in.
