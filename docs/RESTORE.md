# Restore — read this at 2am

Project: `nlmwxodvquwbjinhhbmr` (diedericksdobermanns).
Dashboard: https://supabase.com/dashboard/project/nlmwxodvquwbjinhhbmr

## Retention on the current plan

Supabase **Pro** keeps **7 days** of daily Postgres backups. Team is 14 days; Enterprise up to 30.

Open **Database → Backups** and read the dates listed. If you only see a week of snapshots, you are on the Pro window. Point-in-Time Recovery (PITR) is a paid add-on (~$100/month for 7 days). It is **not** on unless you enabled it under **Project Settings → Add-ons**.

A backup nobody has restored is a hope. Once a month the to-do list will ask: *Confirm the last backup restored cleanly.* Do it.

## How to restore to a point in time

1. Dashboard → **Database → Backups**.
2. If PITR is on: **Point in Time**, pick the second, confirm. The project goes read-only, then comes back as that moment.
3. If PITR is off: pick a **daily backup**, restore. You lose everything written after that snapshot.

This overwrites the live database. There is no undo except restoring a later backup.

## What breaks

- The website and app will error or look empty until restore finishes.
- Auth users, applications, quotes, contracts, messages — all roll back with Postgres.
- **Storage files are not in this backup.** Photos, PDFs, signatures stay in the Storage buckets. A restore can leave a documents row pointing at a file that was uploaded after the snapshot (or the reverse). See below.
- Edge Functions are deployed code, not data. They are unaffected.
- Anyone signed in may need to sign in again.

## How long it takes

Plan for **15–60 minutes** of downtime on a database this size. Bigger restores take longer. Do not refresh the dashboard every ten seconds — let it finish.

## Who to contact

1. Supabase Support from the dashboard (Pro includes email support).
2. Matt, then whoever has the GitHub and Vercel logins.
3. If the site must stay up for a go-home day: put a one-line notice on the website and pause public applications until restore completes.

## Storage is not in Postgres

Buckets (`documents`, `dog-media`, `gallery`, `litter-media`, `broadcasts`, `contract-signatures`, `training-videos`) live in object storage.

- Private buckets need the Storage policies that Phase 1 locked (a client only sees `dog/`, `kennel/`, and their own `{user_id}/` folder).
- Public buckets (`dog-media`, `gallery`, `training-videos`) are readable by URL; listing by `anon` is denied.
- There is **no one-click restore of files**. If a file is deleted, it is gone unless you have an object-storage backup of your own. Do not “clean up” live buckets without an export.

## Sessions (do not change these without saying why)

Current Auth values, left as they are:

- **JWT lifetime:** 3600 seconds (1 hour). Portal sessions expire; the client refreshes with the refresh token.
- **Refresh token rotation:** on. A stolen refresh token is invalid after the next use.
- **Reuse interval:** 10 seconds (GoTrue default). Stops a double-refresh from a slow mobile network killing the session.

Changing JWT expiry shorter will log people out mid-quote. Longer leaves a stolen session alive longer.

## After a restore

1. Sign in as admin. Open `/admin/security` and `/admin/errors`.
2. Spot-check one recent application, one quote, one contract.
3. Confirm a client can still open their own documents and not anyone else’s.
4. Tick the monthly to-do as done.
