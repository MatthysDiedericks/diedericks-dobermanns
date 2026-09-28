# Cursor Prompt — Two real faults from the 18 Sep health check

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both when done. Paste the real output.

The morning check listed four things. **Two of them were wrong and two are real.** I verified every
one against the live database and both working trees before writing this, so start from here rather
than re-deriving it.

| Reported | Truth |
|---|---|
| Migrations `0182`–`0185` written but never applied | **False.** All four are live. `dogs.outcome` exists, `company` is in the allocation constraint, `expense_lines` exists, `archived` is in the litters constraint. The check was comparing filenames against `supabase_migrations.schema_migrations`, which has no row for a migration applied through the MCP tools. Already fixed in the check itself. |
| Admin funnel broken since 17 Sep | **Half true.** One error row, ever, at 15:27 on 17 Sep. An authenticated admin can read the table right now — 65 rows. See §2. |
| Backups 8 days stale | Real, but Matt's job, not yours. |
| 3 applications unactioned | Real, but Matt's job, not yours. |

What the check **missed** is the serious one, and it is §1.

---

## 1. Every file in both repos has had its line endings flipped, and today's work is untracked

```
diedericksdobermann-web    707 modified    48 untracked    0 commits ahead of origin/main
diedericks-dobermanns     1375 modified    62 untracked
```

Two separate problems tangled together.

### 1a. The 707 and 1375 "modified" files are not modifications

`core.autocrlf` is unset, there is no `.gitattributes`, and the working tree is now CRLF while the
index is LF. `git diff --numstat` on any of them returns equal added and deleted counts equal to the
file's length — the whole file, rewritten, with no content change:

```
74  74  README.md
7   7   postcss.config.mjs
33  33  supabase/migrations/0171_receipts_bucket.sql
```

A migration that has been applied for weeks is not something anyone edited today. This is tooling,
not work.

**Commit it as-is and the damage is permanent**: a 755-file commit in which 707 files are noise,
`git blame` reset across the entire codebase, and the 48 files that actually matter invisible inside
it. Nobody will ever review that diff, which means nobody will ever catch what is in it.

**Fix the cause before committing anything.** Add `.gitattributes` at the root of **both** repos:

```gitattributes
* text=auto eol=lf
*.png  binary
*.jpg  binary
*.jpeg binary
*.webp binary
*.pdf  binary
*.ico  binary
```

Then renormalise, in each repo:

```bash
git add --renormalize .
git status --porcelain | wc -l
```

That count should collapse from 755 to roughly the number of files with real changes. **Report the
before and after numbers.** If it does not collapse, stop and tell me — do not push a 755-file
commit to find out why.

### 1b. The 48 and 62 untracked files are a full day's work that exists only on Matt's disk

Not committed, not pushed, not deployed, not backed up. One disk failure and all of it is gone. In
the website repo alone:

```
supabase/migrations/0182_litter_profitability_foundation.sql
supabase/migrations/0183_expense_allocation_company.sql
supabase/migrations/0184_expense_lines_and_allocations.sql
supabase/migrations/0185_litter_archived_status.sql
src/lib/finance/          dogDays, resolveAllocations, allocationLedger,
                          backfillSharedAllocations, reconcileAllocations, reclassifyExpenses
src/lib/litters/          validate, newbornPuppy, deleteImpact, guide, outcomes, parentOptions
src/lib/health/           nextDue, productMatch
src/lib/dogs/             progenySummary, status.test
src/components/           WhelpingFlow, LitterDeleteConfirm, GalleryItemEditPanel,
                          GalleryFileFields, DogStatusControl, PedigreeMobileChart,
                          ExpenseAllocationReconciliation
src/app/api/health/       the uptime probe
scripts/backfill-shared-allocations.ts
```

The migrations are **already applied to the live database.** So right now production runs a schema
that no committed code knows about. That is the wrong way round and it needs to stop today.

**After 1a lands**, commit in coherent slices — not one giant commit:

1. `.gitattributes` and the renormalisation, on its own, with a message saying it is line endings only
2. The four migrations
3. Finance: allocation engine, ledger, reconciliation, backfill script
4. Litters: whelping flow, validation, delete confirmation, newborn intake
5. Dogs: status control, progeny summary, pedigree mobile chart
6. Gallery: per-file fields and edit panel
7. The `/api/health` route

Then push. **Then confirm the live site is serving the new commit** — read the commit hash back from
`https://www.diedericksdobermanns.com/api/health` and compare it to `git rev-parse HEAD`. A green
Vercel build is not the check; the check is the hash.

**Before you commit anything, run `git status --porcelain | grep '^??'` and read the list.** The
`backups/` and `backups-storage/` folders hold `contacts.json`, `users.json` and
`applications.json` — real client data. They are in `.gitignore` and they must stay there. This has
come within one command of being published twice. Confirm in your report that no file under
`backups`, `backups-storage`, `tmp-*` or `_archive_*` is staged.

---

## 2. `/admin/applications` queries the database before it checks who is asking

One error row, 17 Sep 15:27 UTC:

```
ADMIN_QUERY_FAILED — Application funnel could not be loaded
{"postgres": "permission denied for table application_step_events"}
```

### What it is not

It is not a broken grant and it is not a data leak. Migration `0178` grants `select` on that table
to `authenticated` and `insert` only to `anon`, RLS policy `Admins read step events` gates select on
`is_admin()`, and a simulated authenticated admin reads 65 rows from it right now. The table is fine.

`permission denied for table` is a **grant** error, not an RLS error — RLS returns zero rows, it does
not raise. So that one request reached Postgres as `anon`. It had no session.

### What it is

`src/app/admin/(panel)/applications/page.tsx` does not call `requireAdmin()`. It relies on
`(panel)/layout.tsx` to do it. But a Next.js layout and its page render **in parallel** — so on a
request with an expired or absent session, `fetchApplicationFunnel` reaches the database as `anon`,
raises, and logs an error, and only afterwards does the layout's `redirect("/admin/login")` unwind
the render.

The corroboration is that `(panel)/analytics/page.tsx` calls the same function on the same table and
has **never** produced this error — and it does call `requireAdmin()` itself.

So: a logged-out visit to `/admin/applications` writes a scary error row and shows the user a login
page. The funnel is not broken. The logging is lying.

### Fix, in both repos

**a. Guard the page.** Add `await requireAdmin();` as the first statement in
`src/app/admin/(panel)/applications/page.tsx`, before any query. Then audit every other page under
`(panel)` and do the same wherever a page queries before the layout can redirect. Do not rely on
parallel rendering for authorisation — a layout check is a redirect, not a gate.

**b. Stop misreporting an unauthenticated request as a failure.** In
`src/lib/admin/applicationFunnel.ts`, `trackingTableMissing()` matches only `does not exist`,
`could not find`, `schema cache` and `42p01`. A permission error falls through to
`logAdminQueryError` and the funnel silently renders empty with `trackingReady: true`.

Split the three cases and return a distinct outcome for each:

- **table missing** → `trackingReady: false`, as today, no error logged
- **`permission denied` / `42501`** → do not log an application error. The caller is not entitled to
  the data; that is authorisation working, not a fault. Return the empty snapshot and let the
  redirect happen.
- **anything else** → log it, as today

**c. Fix the misleading log field.** `logAdminQueryError` hardcodes `actorRole: "admin"`, which means
"the admin area" and reads as "an admin was signed in". It is what made this look like a broken
feature for an authenticated admin. Pass the real role through — the caller's `requireAdmin()` result
where there is one, `"anon"` where there is not.

---

## Do not

- Do not commit before `.gitattributes` and `git add --renormalize` have collapsed the file count.
- Do not stage anything under `backups`, `backups-storage`, `tmp-*` or `_archive_*`.
- Do not re-run, edit or re-apply migrations `0182`–`0185`. They are applied and correct.
- Do not grant `select` on `application_step_events` to `anon`. That table holds applicant
  submission IDs and device strings. The grant is right as it is.
- Do not change the RLS policies on that table.
- Do not create test applications, dogs or litters in production.

---

## Report

1. `git status --porcelain | wc -l` in both repos, **before and after** the renormalisation.
2. The commit list you actually made, and the push output.
3. `git rev-parse HEAD` alongside the `commit` field returned by
   `https://www.diedericksdobermanns.com/api/health` — they must match.
4. Confirmation that nothing under `backups`, `backups-storage`, `tmp-*` or `_archive_*` was staged.
5. The list of `(panel)` pages that were querying before an auth check, and which ones you guarded.
6. The three-way error branch in `applicationFunnel.ts`, and a test proving a `permission denied`
   response logs nothing.
7. `npx tsc --noEmit` clean in both repos.
