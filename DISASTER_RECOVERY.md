# Disaster recovery — Diedericks Dobermanns

**If something has gone badly wrong, start here. Work top to bottom. Do not skip ahead.**

Last checked: 10 September 2026.

---

## First: which of these actually happened?

Only one of them is a real emergency. Read the four lines and pick yours.

| Situation | Severity | Go to |
|---|---|---|
| Laptop died, stolen, or reinstalled | Annoying, nothing lost | **Scenario A** |
| Website is down or showing the wrong thing | Minor | **Scenario B** |
| Someone deleted records, or bad data got in | Serious | **Scenario C** |
| The Supabase project is gone or unrecoverable | **The real one** | **Scenario D** |

Cursor and Claude crashing are not on this list. Neither holds your data. Reinstall and carry on.

---

## What lives where

Knowing this makes the rest obvious.

| Thing | Where it really lives | Safe if the laptop dies? |
|---|---|---|
| The code | GitHub — two repos | Yes |
| Table structure | `supabase/migrations/*.sql`, in GitHub | Yes |
| The data (rows) | Supabase cloud | Yes — unless Supabase itself is lost |
| Photos, PDFs, contracts | Supabase Storage | Yes — same caveat |
| The live website | Vercel, built from GitHub | Yes |
| **Your `.env` keys** | **Your laptop only** | **No — see A3** |
| Backups you have taken | `backups\` and `backups-storage\` in the project folder, synced by OneDrive | Yes |

**You are on the Supabase Free plan. Supabase keeps no backups for you.** The only copies of your data are the ones you make with the scripts below.

---

# Scenario A — New or rebuilt computer

Nothing has been lost. You are reconnecting, not recovering. About an hour.

**A1. Install the tools.** Node.js (LTS), Git, Cursor. Sign in to Cursor and GitHub.

**A2. Get the code back.** In a terminal, in the folder where you want the project:

```
git clone https://github.com/<your-account>/diedericks-dobermanns.git
git clone https://github.com/<your-account>/diedericksdobermann-web.git
```

Then in each folder: `npm install`.

**A3. Put the keys back.** This is the only step that is not automatic, because keys are deliberately kept out of GitHub.

Create `diedericks-dobermanns\.env` with:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Create `diedericksdobermann-web\.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DAILY_API_KEY=
DAILY_DOMAIN=
RATE_LIMIT_SALT=
```

The Supabase values come from **supabase.com → your project → Settings → API**. The rest come from **Vercel → the project → Settings → Environment Variables**, which is the safest habit: treat Vercel as the master copy of the website's keys.

**A4. Check.** `npm run dev` in the website folder, open the local address, log in to the admin. If dogs and clients appear, you are done.

---

# Scenario B — Website down or serving the wrong version

**B1.** Vercel → the project → **Deployments**. Check the newest is *Ready*, not *Error*.

**B2.** If it errored, open the build log and read the last red line. Usually a TypeScript error from the last push.

**B3.** To get back to working immediately: find the last deployment that was Ready, open the "…" menu, choose **Promote to Production**. That puts yesterday's working site back in about a minute, and buys you time to fix the real problem.

**B4.** If the site is up but missing a feature you know was built: it was never pushed. Compare what is on your machine with what is on GitHub. This has caught us out three times — a fix on disk is not a fix in production.

---

# Scenario C — Data was deleted or corrupted

**Stop using the app first.** Every minute of continued use makes an untangle harder.

**C1.** Work out what and when. Ask me — the `audit_log` table records changes and can usually name the record and the time.

**C2. Small — a handful of records.** Do not restore anything. Find the rows in the newest folder under `backups\`, and put those specific records back by hand. A full restore to fix three rows would undo every good change since the backup.

**C3. Large — a whole table, or wide damage.** Take a fresh backup **first**, even of the damaged state — you may need something from it later. Then restore only the affected tables from the last good backup.

---

# Scenario D — Supabase project lost

The serious one. Roughly two to four hours, mostly waiting on uploads.

**D0. Do not delete anything.** If the project still exists at all, even broken, leave it. Recovering a damaged project beats rebuilding from scratch every time.

**D1. Make a new Supabase project.** supabase.com → New project. Note the new URL and keys — everything else points at the old ones.

**D2. Rebuild the tables.** Supabase → SQL Editor. Open `diedericksdobermann-web\supabase\migrations\` and run each `.sql` file **in numerical order**, 0001 upward. Do not skip and do not reorder — later ones depend on earlier ones. This recreates every table, rule and security policy exactly.

**D3. Put the data back.** Update your `.env` files to the new project's URL and service key, then from the project folder:

```
node scripts/restore-supabase.mjs --from backups/<newest-folder>
```

That is a dry run — it shows what it would do and writes nothing. Read it. When it looks right:

```
node scripts/restore-supabase.mjs --from backups/<newest-folder> --write
```

It sorts out the order itself and retries anything that depends on something not loaded yet.

**D4. Put the files back.** Supabase → Storage. Create the buckets, matching the folder names under `backups-storage\<timestamp>\`, and match the public/private setting in that folder's `manifest.json` — `documents` **must be private**; it holds client IDs and contracts. Then upload each bucket's folder contents.

**D5. Repoint the apps.** Vercel → Settings → Environment Variables → update the three Supabase values → redeploy. Update your local `.env` files too.

**D6. Logins.** Client and staff logins are separate from your tables and do not come back with the data. Everyone will need a fresh portal invite. Expect this; it is not a sign something went wrong.

**D7. Check before telling anyone it is fixed.** Load the public site signed out. Log in as admin and confirm dogs, clients and invoices are there. Log in as one client and confirm they see their own dog **and nothing belonging to anyone else**.

---

# Taking the backups

Both from the project folder, in a terminal.

```
node scripts/backup-supabase.mjs      (the data — fast)
node scripts/backup-storage.mjs       (the files — slower, ~243 MB)
```

They write into `backups\` and `backups-storage\`, which OneDrive then syncs, so you get an off-site copy without doing anything.

**Weekly is the right rhythm**, and always before applying migrations.

The storage script skips files it already has, so re-running it is quick and safe.

---

# Three things worth fixing

**1. This has never been tested.** A restore you have not rehearsed is a guess. The safe way: make a throwaway Supabase project, run D2 and D3 into it, see it work, delete it. An hour once, and then you know.

**2. You are on the Free plan.** Supabase Pro is about $25/month and adds daily automatic backups. For a business holding client contracts and financial records, that is cheap.

**3. Your keys exist in one place.** If the laptop dies you can regenerate them (A3), but a copy in a password manager turns a stressful hour into five minutes.
