# Staff CRM setup

## One-time: apply the database migration

In the Supabase SQL Editor for project `vxqryagqfqsjcwndifvl`, run:

`supabase/migrations/20260820145837_profiles_and_coaching_progress.sql`

This creates `profiles` and `coaching_progress` with RLS so members can only read/update their own rows, and admins can select all.

## One-time: mark staff as admin

1. Open **Supabase → Authentication → Users**
2. Select the staff account
3. Under **App Metadata** (not User Metadata), set:

```json
{ "role": "admin" }
```

4. Save, then have the staff member sign out and sign back in so the JWT refreshes

Admins see a **CRM** link in the header (next to Members) and can open `/crm.html`. Regular members are redirected to `members.html`.
