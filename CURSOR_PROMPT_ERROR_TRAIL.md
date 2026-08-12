# CURSOR PROMPT — Failure trail: capture, assert, and surface internally

A client was blocked from registering last night. The only reason anyone knows is that he sent
Matt a screenshot on WhatsApp. The error existed solely in Supabase's auth log, which is retained
for days — by next week it would have been gone, and the cause unknowable.

**Everyone else who hit the same bug simply left, and there is no record they were ever here.**

This builds the trail, the checks that catch failures no error log can see, and the internal
alerting so a client's goodwill is not the transport layer for bad news.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The constraint that decides the design

**The trail must land in Postgres.** Vercel logs, browser consoles and Supabase's own log stream
are either short-lived or unreachable to the people diagnosing this. A table in the project
database is queryable months later, joinable against the quote or the dog it concerns, and
covered by the existing audit and backup arrangements.

Do **not** add Sentry or another third-party service for this. It is another vendor, another
consent question under POPIA, and the data would sit where it cannot be joined to anything.

---

## Two kinds of failure — this must handle both

**Loud** — something threw or an API returned an error. Last night's password rejection.
Catchable, if we bother to catch it.

**Silent** — the code did exactly what it was written to do and the result was still wrong.
Quote DD-1135 lost a delivery line to `.filter((it) => it.description.trim())`. Nothing threw.
**No error log would ever have shown this.** Only an assertion comparing intent to outcome catches
it, and that is the more valuable half of this work.

---

## Migration `0065_error_events.sql`

```sql
create table public.error_events (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  code          text not null,          -- stable, ours: AUTH_PASSWORD_POLICY, QUOTE_LINE_DROPPED
  area          text not null check (area in
                  ('auth','quote','invoice','payment','contract','upload','portal','admin','app','other')),
  severity      text not null default 'error' check (severity in ('warning','error','critical')),
  message       text,                   -- provider's wording, may change without notice
  detail        jsonb,                  -- structured context. NEVER credentials.
  surface       text check (surface is null or surface in ('website','app','server','script')),
  route         text,
  actor_role    text,                   -- 'anon' | 'client' | 'admin' | 'system'
  actor_id      uuid,                   -- only when signed in
  email_domain  text,                   -- 'gmail.com'. NEVER the full address.
  session_ref   text,                   -- random per-attempt id, ties retries together
  entity_type   text,
  entity_id     text,                   -- e.g. the quote id, so this joins to real records
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id),
  resolution_note text
);
create index error_events_recent_idx on public.error_events(occurred_at desc);
create index error_events_code_idx on public.error_events(code, occurred_at desc);
create index error_events_open_idx on public.error_events(occurred_at desc) where resolved_at is null;
```

### `code` is ours, not the provider's

`"Password should be at least 12 characters."` is Supabase's wording and will change without
warning. `AUTH_PASSWORD_POLICY` will not. **Codes are what make counting possible** — *"14 times
to 9 different people"* rather than one screenshot. Keep the raw provider text in `message` as
supporting evidence, never as the thing we group by.

Define the codes in one shared constants file per repo, with the same values in both.

### What must never be written

Passwords, tokens, full email addresses, ID numbers, addresses. `email_domain` is enough to spot
*"every failure is a Gmail user"*. **Write a test that asserts `detail` contains no key matching
`/pass|token|secret|otp|key/i`** — a rule nobody enforces is a rule that gets broken by the third
developer who needs "just a bit more context".

### RLS

Insert: `anon` and `authenticated` may **insert only** — the failure we most need is the one from
someone who is not signed in. Select/update: `is_admin()` only. No delete policy for anyone.

**Rate-limit the insert** — a public insert endpoint is a way to fill your database. A trigger
rejecting more than ~20 rows per `session_ref` per hour is enough. Follow the flood guard already
in `capture_issue`.

Add to `trg_audit`? **No.** Auditing an error table doubles the noise and tells you nothing.

Retention: purge `resolved_at is not null` after 6 months, unresolved after 24, in the existing
nightly purge job.

---

## Capture

### Shared helper, both repos

`logError({ code, area, severity, message, detail, entityType, entityId })` — fire-and-forget,
never throws, never blocks the user's action.

**If logging fails, the user's operation must still complete.** An error reporter that breaks the
page it is reporting on is worse than no reporter.

Generate a `session_ref` once per page load / app launch and attach it to everything, so three
retries by one frustrated person read as one incident rather than three.

### Where to call it

- Every `catch` that currently only does `console.error`.
- Every Supabase call whose `error` is currently returned to the UI and forgotten.
- **`RegisterForm.tsx` and the app's sign-up screen specifically** — this is the one that bit us.
- Quote and invoice save paths.
- File uploads.
- Contract signing.

Do not wrap everything in try/catch to feed this. Add it where an error is already handled.

---

## The assertions — the half that catches silent failures

Before or immediately after a write, check that the outcome matches the intent. On mismatch:
**block the operation, tell the user plainly, and log with `severity = 'critical'`.**

1. **Quote total** — the total displayed must equal the total being saved. Mismatch → `QUOTE_TOTAL_MISMATCH`, refuse.
2. **Quote line count** — the number of lines the user entered must equal the number written. Mismatch → `QUOTE_LINE_DROPPED` naming the dropped line. *This is the assertion that would have caught DD-1135.*
3. **Registration outcome** — after a signUp reporting success, the client must exist. If not → `AUTH_SIGNUP_PHANTOM`, critical. **A form that says "check your email" when no account was created is the exact failure that cost us a client.**
4. **Invoice from quote** — converted invoice total must equal the quote total.
5. **Payment allocation** — allocations must not exceed the invoice total.
6. **Document upload** — the storage object must exist after the `documents` row is written.

Nightly consistency sweep, logging rather than blocking: quotes whose stored subtotal disagrees
with their lines; invoices whose payments exceed their total; `documents` rows with no storage
object; `check_ins` for dogs where `dog_is_contactable()` is false.

---

## Surface it internally — the actual point

### 1. Health strip, admin dashboard, both repos

Only when there is something to say. Silence when healthy — a permanent "0 errors" panel becomes
invisible within a week.

> **3 registration failures in the last 24 hours** — 2 people affected · *View*

**Client-blocking failures lead**, ahead of anything internal. A registration failure is a buyer
who could not reach you — closer to a missed call than to a log line, and it should read that way.

### 2. `/admin/health` (website)

Grouped by code, newest first: count, distinct people affected, first and last seen, expandable
detail. Filter by area, severity, resolved. Mark resolved with a note.

**Group by `code` and show "how many people", not just "how many events".** One person retrying
five times is one problem; five people once each is a fire.

Include the nightly sweep results on the same page.

### 3. Daily digest to Matt, 07:00

Follow the `notify-pending-applications` pattern exactly — same cron shape, same edge function
style, same secret handling. **To Matt only.** Nothing in this feature ever messages a client.

Skip the send entirely when there is nothing to report. A daily email that is usually empty trains
its own dismissal.

### 4. Immediate alert — a deliberately short list

WhatsApp/email to Matt within minutes, for these **only**:

- `AUTH_SIGNUP_PHANTOM` — form claimed success, no account exists
- `AUTH_REGISTRATION_BLOCKED` — a client could not create an account
- `QUOTE_TOTAL_MISMATCH` / `QUOTE_LINE_DROPPED`
- `PAYMENT_*` at critical

**Do not add to this list without Matt's say-so.** Alert on everything and he mutes it inside a
week, and then it is worse than nothing. Everything else waits for the digest.

Deduplicate: one alert per code per hour, with a count.

### App

Health strip on the admin dashboard and a read-only list screen. Resolving stays on the website —
it needs the detail. **The app must be able to log errors even when offline**: queue locally and
flush on reconnect, or the mobile failures we most need are the ones we never see.

---

## Rules

- Logging never throws and never blocks the user's action.
- Never write credentials, tokens, full emails or ID numbers. Test-enforced.
- `code` is ours and stable; provider wording lives in `message`.
- Nothing in this feature messages a client, ever.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.
- Do not revoke EXECUTE from PUBLIC on any function used by a policy — that caused a 6.7-hour outage in July.

## Verify

- [ ] A signed-out visitor failing registration writes an `error_events` row with `actor_role = 'anon'`.
- [ ] That row contains no password and no full email address — only `email_domain`.
- [ ] The no-credentials test fails when a password field is deliberately added to `detail`.
- [ ] A non-admin cannot read `error_events`; nobody can delete from it.
- [ ] Inserting 30 rows with one `session_ref` in an hour is rate-limited.
- [ ] Breaking the error endpoint still lets a quote save normally.
- [ ] **Reproduce DD-1135**: add a quote line with a price and no description. It must be blocked or defaulted, and must write `QUOTE_LINE_DROPPED` if anything is lost.
- [ ] Force a signUp that reports success without creating a user → `AUTH_SIGNUP_PHANTOM` at critical, and an immediate alert to Matt.
- [ ] Three retries by one person group as one incident by `session_ref`.
- [ ] The dashboard strip is absent when there are no unresolved events.
- [ ] The digest does not send on a clean day.
- [ ] `/admin/health` shows people-affected separately from event count.
- [ ] The app queues an error raised offline and flushes it on reconnect.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`, or
`supabase/migrations/0061_contacts_dedupe.sql`.
