# Cursor Prompt — Switch on the funnel, fix the dead application links, deploy

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both repos when done. Paste the real output.

**Three jobs, in this order.** Verified against the live database and the live site on 11 September 2026 — do not re-investigate, the findings below are checked.

---

## Job 1 — Apply migration 0178. It is built and switched off.

`0178_application_step_events.sql` exists in both migration folders. **It has never been applied.** The `application_step_events` table does not exist on the live database.

The tracking code is already deployed-ready and already wrapped in try/catch, so it fails silently and the form works perfectly — **and collects nothing**. The analytics funnel will render empty and read as "nobody visits", which is the opposite of true: 244 visitors so far this month.

Apply `0178`, then confirm:

```sql
select count(*) from information_schema.tables
 where table_schema='public' and table_name='application_step_events';   -- expect 1

select count(*) from pg_indexes
 where indexname='application_step_events_once';                          -- expect 1
```

Then reload the schema cache if the migration does not already do it, and **prove the public role can write but not read**:

```sql
-- as anon: insert must succeed, select must return nothing / be refused
```

Paste both results. If `anon` can read that table, stop — that is a list of everyone part-way through an application.

---

## Job 2 — Migration 0179: stop deleted applications becoming broken links

**This section was added to `CURSOR_PROMPT_STOP_DUPLICATE_APPLICATIONS.md` after you had already run it, so you never saw it.** It is the only part of that prompt still outstanding.

### What happened

On 10 September four duplicate applications from one applicant were deleted from the database. The "New application" alert emails already sitting in Matt's and Felicia's inboxes still carried `View application →` links pointing at those records. Felicia clicked one and got a bare 404 — which looked exactly like her admin access being broken, and cost an hour diagnosing an access problem that did not exist.

`src/app/admin/(panel)/applications/[id]/page.tsx` line 73 is the whole cause:

```ts
if (!app) notFound();
```

Alert emails live in inboxes for months. Any record they point at must fail in a way that explains itself.

### 2a. The migration

**Use `0179`, not `0177`.** `0178` is already on disk, and numbering backwards would be confusing later. Byte-identical in both folders.

```sql
-- 0179_application_merged_into.sql
-- Deduplicating by DELETE breaks every alert email already sent. Keep a
-- tombstone instead: the loser stays, archived, pointing at the survivor,
-- so an old link redirects rather than 404s.

alter table public.applications
  add column if not exists merged_into_application_id uuid
    references public.applications(id) on delete set null;

create index if not exists applications_merged_into_idx
  on public.applications (merged_into_application_id)
  where merged_into_application_id is not null;

notify pgrst, 'reload schema';
```

Nullable and additive. It does **not** restore the four already deleted — nothing short of the backup file could, and that is fine.

### 2b. Three outcomes, not one

Replace the bare `notFound()`:

- **Merged** — the row exists and `merged_into_application_id` is set → **redirect** to the surviving application and show a note at the top: *"You followed a link to an earlier duplicate of this application. This is the record we kept."*
- **Archived** — already handled. Leave it alone.
- **Genuinely missing** — the id is not in the table at all, which is the case for the four deleted on 10 September → render a real page:

  > **This application is no longer available.**
  > It may have been merged with another application from the same person, or removed. If you followed a link from an email, that email may be out of date.
  > [Back to applications]

  Put a search box on that page so the applicant's name can be typed straight in and the surviving record found in one step.

**Do not use `notFound()` for either case.** A 404 inside an admin area reads as "you are not allowed", which is the wrong message and is precisely what happened.

### 2c. A merge button, so this never needs SQL again

On the applications list, where the "Possible duplicate" badge appears, add **Merge duplicates**:

1. Show the matching applications side by side with their differences highlighted.
2. Matt picks which one to keep.
3. The others are **archived, never deleted** — `archived_reason = 'merged'`, `merged_into_application_id` set to the survivor.
4. Log an `application_events` row on the survivor recording which references were merged in and by whom.

**Merging must never delete a row.** That is the rule this whole job exists to enforce.

One judgement call to surface rather than automate: if the duplicates disagree on `marketing_opt_in`, show it and default to the **most recent** answer. On 10 September the applicant ticked yes four times and no on her final attempt — and the no is what counts.

---

## Job 3 — Deploy. None of this is live.

Cleopatra's public page serves her corrected registered name and her PSA result, because those are database changes. **"Behind this dog" is not on the page**, which means the website has not been pushed since yesterday's `storeFiles.ts` commit.

Everything built across the last several prompts — the phone validator, the bloodline credentials block, the stock screen, the employee screens, the funnel tracking, the analytics upgrade — is sitting uncommitted on Matt's machine.

Commit, push, then **confirm the live deployment is serving that commit**. Compare the deployed commit hash against `origin/main`. "The build succeeded" is not the check — production ran 17 hours behind a fix on 10 September and four applicants lost their uploaded ID because of it.

Report the commit hash and the deployment URL.

---

## Do not

- Do not delete, archive or edit any application. Yesterday's cleanup is done.
- Do not restore the four deleted duplicates.
- Do not change the application form's fields, wording or validation — funnel measurement must run against the form as it is today, or the data means nothing.
- Do not add a migration beyond `0179`.
- Do not touch the security policies added by `0175`.

---

## Report

1. `0178` applied — the two counts above, plus the anon insert-yes / select-no proof.
2. `0179` in both folders, byte-identical. Show the diff.
3. `merged_into_application_id` exists on `applications`.
4. Screenshot of the "no longer available" page — reached by visiting `/admin/applications/a0ebc0eb-b6ca-4690-ba03-6ebd1253401b`, one of the real deleted ids. It must not be a 404.
5. Screenshot of the merge screen with the two applications side by side.
6. `node scripts/check-migration-numbers.mjs` passing — the 0176 → 0178 gap is intentional and must not be flagged as an error.
7. Commit hash, deployment URL, and confirmation the live site is serving it.
8. **"Behind this dog" visible on Cleopatra's public page** — that is the proof the deploy actually landed.
9. `npx tsc --noEmit` clean in both repos.
