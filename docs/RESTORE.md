# Restore — read this at 2am

Project: `nlmwxodvquwbjinhhbmr` (diedericksdobermanns).
Dashboard: https://supabase.com/dashboard/project/nlmwxodvquwbjinhhbmr

## What actually exists (Free plan)

This project is on the **Supabase Free plan**. Matt has decided to stay there for now.

Free includes **no platform-managed Postgres backups** and **no Point-in-Time Recovery**.
Dashboard → **Database → Backups** will not offer a restore. There is no 7-day window.
Pro's 7-day daily backups and the PITR add-on (~$100/month) are **not** on this project.

The only copy of the database you can restore from is one **you** made:

```
supabase db dump --linked -f backups/dd-$(Get-Date -Format yyyyMMdd).sql
```

Keep that file off this laptop as well as on it. A dump nobody has restored is a hope.
Once a month the to-do list will ask: *Confirm the last dump restored cleanly.* Do it.

## How to restore

1. You need a dump file. If you do not have one, there is nothing to restore to.
2. `supabase db dump` is a logical copy of Postgres. It does **not** include Storage files.
3. Restoring overwrites the live database. There is no undo except another dump.

Do not open **Database → Backups** expecting a Pro-plan snapshot. It is not there.

## What breaks

- The website and app will error or look empty until restore finishes.
- Auth users, applications, quotes, contracts, messages — all roll back with Postgres.
- **Storage files are not in a dump.** Photos, PDFs, signatures stay in the Storage buckets.
  A restore can leave a documents row pointing at a file uploaded after the dump (or the reverse).
- Edge Functions are deployed code, not data. They are unaffected.
- Anyone signed in may need to sign in again.

## How long it takes

Plan for **15–60 minutes** of downtime on a database this size. Bigger restores take longer.
Do not refresh the dashboard every ten seconds — let it finish.

## Who to contact

1. Supabase Support from the dashboard — Free is **community** support, not email SLA.
2. Matt, then whoever has the GitHub and Vercel logins.
3. If the site must stay up for a go-home day: put a one-line notice on the website and pause
   public applications until restore completes.

## Storage is not in Postgres

Buckets (`documents`, `dog-media`, `gallery`, `litter-media`, `broadcasts`, `contract-signatures`,
`training-videos`) live in object storage.

- Private buckets need the Storage policies that Phase 1 locked (a client only sees `dog/`,
  `kennel/`, and their own `{user_id}/` folder).
- Public buckets (`dog-media`, `gallery`, `training-videos`) are readable by URL; listing by `anon`
  is denied.
- There is **no one-click restore of files**. If a file is deleted, it is gone unless you have an
  object-storage backup of your own. Do not "clean up" live buckets without an export.

## Sessions (do not change these without saying why)

Current Auth values, left as they are:

- **JWT lifetime:** 3600 seconds (1 hour). Portal sessions expire; the client refreshes with the
  refresh token.
- **Refresh token rotation:** on. A stolen refresh token is invalid after the next use.
- **Reuse interval:** 10 seconds (GoTrue default). Stops a double-refresh from a slow mobile
  network killing the session.

Changing JWT expiry shorter will log people out mid-quote. Longer leaves a stolen session alive longer.

## After a restore

1. Sign in as admin. Open `/admin/security` and `/admin/errors`.
2. Spot-check one recent application, one quote, one contract.
3. Confirm a client can still open their own documents and not anyone else's.
4. Tick the monthly to-do as done.
