# Members CRM

This page lists **fellowship members** from Supabase Auth (people who joined): name, email, church, role, coaching step.

Open:

- https://6-4-fellowship.vercel.app/crm.html
- https://6-4-fellowship.vercel.app/CRM

## Required: create the member tables (one paste)

Until this runs, the CRM cannot show anyone (`profiles` does not exist yet).

1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the full contents of [`supabase/SETUP_MEMBERS_CRM.sql`](../supabase/SETUP_MEMBERS_CRM.sql)
3. Click **Run**
4. Refresh `/crm.html`

That script:

- Creates `profiles` + `coaching_progress`
- Backfills rows from existing Auth users (e.g. Hudson Hirst)
- Auto-creates a profile when someone new joins
- Allows the open CRM page to read the directory

New joins also upsert a profile from the site; signing into Members syncs coaching progress.
