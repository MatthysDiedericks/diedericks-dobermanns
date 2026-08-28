# CURSOR PROMPT — Review of Security Phases 1–3: one live outage fixed, three gaps to close

I verified your work against the **live database**, behaviourally — running the exploits and the
happy paths, not reading the migrations. **Most of it is correct.** One thing was not, and it took
the two most important public forms offline.

---

## 1 · WHAT YOU BROKE — already fixed live, but you must capture it

`trg_rate_limit_insert` contained this line:

```sql
if tg_table_name = 'error_events' and new.code like 'SECURITY_%' then
```

`new.code` exists **only on `error_events`**. The trigger is attached to four tables.

**SQL boolean `AND` does not short-circuit.** PL/pgSQL compiles that condition into a single
expression and resolves `new.code` against the actual record shape at execution — so on
`applications`, `enquiries` and `signup_failures` it raised
`record "new" has no field "code"` and **aborted every insert**.

**Measured live, before the fix:**

| Table | Result |
|---|---|
| `enquiries` | 7 of 7 inserts failed — **contact form dead** |
| `applications` | every insert failed — **buyer intake dead** |
| `signup_failures` | every insert failed |
| `error_events` | worked (it has `code`) |

Rate limiting is meant to stop a script filing ten thousand applications. It stopped **all of them,
including real buyers**, and it did so silently — the public form would have shown a generic error.

**I fixed it live** by reading the field through `to_jsonb(new) ->> 'code'`, which is valid for any
record shape:

```sql
if tg_table_name = 'error_events'
   and coalesce(to_jsonb(new) ->> 'code', '') like 'SECURITY_%' then
  return new;
end if;
```

**Verified after the fix:** enquiries accept 5 then refuse the 6th; applications accept 3 then refuse
the 4th — both with the friendly message and the WhatsApp fallback. Exactly the specified limits.

**Your job:** add this as a new migration so it survives a replay. The comment explaining *why*
must go with it — this is a trap that reads as correct and will be reintroduced by the next person
who tidies the function.

**And this is the lesson worth keeping:** a `BEFORE INSERT` trigger on a public form is the single
most dangerous place to put untested code. **Never ship one without inserting a row as `anon` and
watching it succeed.** Creating the trigger is not evidence that it works.

---

## 2 · What is correct — verified, not assumed

Confirmed by running it:

- **0086 captures both live fixes.** The documents storage policy and the RPC revokes are in a migration. Good — that was the highest-risk item.
- **Admin guards fire.** A real client JWT calling `pause_audit()` gets `42501`; an admin passes the guard. Tested with a live client UUID.
- **`claim_my_records()`** has the NULL guard.
- **Anonymous listing is closed** on `gallery`, `dog-media`, `training-videos` and `documents` — 0 rows each as `anon`.
- **Public images still load.** The live gallery renders 110 images. This was the regression that mattered and it did not happen.
- **Upload scoping** is right: `gallery` and `training-videos` staff-only, `dog-media` staff-or-own-folder.
- **Magic-byte validation** exists **with a test file** — `src/lib/uploads/magic.test.ts`. Good instinct.
- **Honeypots** on `/api/apply`, `/api/enquiry`, `/api/newsletter`, `/api/waitlist`.
- **Signed unsubscribe tokens** replaced the bare UUID, and the live footer reads *"Unsubscribe any time, no login."* — the POPIA requirement is intact.
- **All five security headers** plus the existing CSP, which you extended rather than loosened.
- **Gitleaks in CI**, `docs/RESTORE.md` written, `/admin/security` built.
- **Rate limits are enforced by database triggers**, not middleware — so a direct PostgREST post is caught. That is the correct architecture and you got it right.

---

## 3 · Fix these three

### 3a. Migration numbering skips 0094

`0093` → `0095`. Either a migration was written and deleted, or the number was skipped. **Say which.**
If something was dropped, I need to know what it was — a missing security migration that everyone
assumes exists is worse than one that was never written.

### 3b. Rate-limit buckets were left in the table

My tests left 3 rows in `rate_limit_buckets`; I cleared them. Confirm the **24-hour cleanup** exists
and is actually scheduled — a table that only grows will eventually slow the insert path on the
forms it is meant to protect. Show the cron entry or the scheduled call, not just the function.

### 3c. Prove the app side

Phases 1–3 were both-repos tasks. I verified the website. **For `diedericks-dobermanns`, show me:**

- Rate limiting on submit and upload — the app posts to the same database, so the triggers cover it, but confirm the app **handles the refusal** and shows the friendly message rather than a raw Postgres error.
- Magic-byte and size validation on app uploads.
- Honeypot / minimum fill time on the app's application flow.
- `/admin/security` summary in the app.

`ls` each file and paste the output. **Do not rely on grep — it has returned false negatives on this filesystem.**

---

## 4 · Still outstanding — not yours, but they belong on the record

- **Leaked-password protection is still disabled** (Matt, Supabase Dashboard → Authentication → Policies). Open since 31 July.
- **`felicia03@rocketmail.com` still holds `admin`** — Matt to confirm or downgrade.

---

## Verify — paste output for each

- [ ] The `to_jsonb` fix is in a new migration, with the comment explaining why, and applying it to the live database is a no-op.
- [ ] As `anon`, 5 enquiries succeed and the 6th is refused with the friendly message. Paste all six results.
- [ ] As `anon`, 3 applications succeed and the 4th is refused. Paste all four.
- [ ] An insert into `error_events` with a `SECURITY_` code still bypasses the limit.
- [ ] **Submit the real contact form and the real application form on the live site**, end to end. A trigger that passes in SQL and fails in the browser is still a broken form.
- [ ] You have explained the 0094 gap.
- [ ] The `rate_limit_buckets` cleanup is scheduled — paste the schedule.
- [ ] `select count(*) from public.rate_limit_buckets` after your tests returns to 0, or you clear it.
- [ ] Each app-side item exists — `ls` and paste.
- [ ] The app shows the friendly refusal message, not a raw database error. Screenshot or paste the handler.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
