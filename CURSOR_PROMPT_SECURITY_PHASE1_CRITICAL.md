# CURSOR PROMPT — Security Phase 1 (CRITICAL). Run this before anything else.

Two exploitable holes were found and **fixed directly on the live database on 18 Aug 2026**. They
are **not in any migration file**. If migrations are ever replayed from scratch, both holes come
back. Capturing them is job one.

Full findings: `SECURITY_AUDIT_2026_08_18.md`.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Read this before you write a line

These were verified live. Do not re-derive them, and do not assume anything not listed here.

- **RLS is on with policies on every `public` table.** Do not add or "fix" table RLS in this task.
- **All 55 `SECURITY DEFINER` functions already have a pinned `search_path`.** Leave them.
- **`is_admin()` and `is_trainer_or_above()` are used inside RLS policies.** **Never revoke `EXECUTE` on either, from any role.** Doing this took the site down for 6.7 hours in July. Grant, never revoke.
- Three tables accept anonymous inserts by design: `applications`, `error_events`, `signup_failures`.
- Storage paths in `documents`: `dog/{dog_id}/…`, `kennel/{id}/…`, and `{user_id}/proof_of_payment/…`.

---

## 1 · Capture the live fixes as a migration — do this first

One new migration reproducing exactly what is live now. It must be **idempotent**, because the live
database already has it applied.

### 1a. Storage: scoped document access

```sql
drop policy if exists "Auth read documents" on storage.objects;
create policy "Auth read documents" on storage.objects for select
using (
  bucket_id = 'documents'
  and auth.role() = 'authenticated'
  and (
        public.is_trainer_or_above()
     or (storage.foldername(name))[1] in ('dog','kennel')
     or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "Auth insert documents" on storage.objects;
create policy "Auth insert documents" on storage.objects for insert
with check (
  bucket_id = 'documents'
  and auth.role() = 'authenticated'
  and (
        public.is_trainer_or_above()
     or (storage.foldername(name))[1] = auth.uid()::text
  )
);
```

**Why it is written this way:** before the fix the condition was `auth.role() = 'authenticated'` and
nothing else, so **every client could read every other client's contracts, ID documents and proof of
payment.** `dog/` and `kennel/` stay readable to any signed-in client because the `documents` table
governs what is actually listed to them; the per-user folders are the private ones.

### 1b. RPC surface: revoke anonymous execute

```sql
revoke execute on function public.pause_audit(text)                    from public, anon;
revoke execute on function public.resume_audit()                       from public, anon;
revoke execute on function public.set_audit_change_note(text)          from public, anon;
revoke execute on function public.merge_contacts(uuid,uuid,uuid)       from public, anon;
revoke execute on function public.sweep_error_consistency()            from public, anon;
revoke execute on function public.generate_due_check_ins(integer)      from public, anon;
revoke execute on function public.refresh_dog_heat_forecast(uuid)      from public, anon;
revoke execute on function public.evaluate_pairing(uuid,uuid)          from public, anon;
grant  execute on function public.pause_audit(text), public.resume_audit(),
       public.set_audit_change_note(text), public.merge_contacts(uuid,uuid,uuid),
       public.sweep_error_consistency(), public.generate_due_check_ins(integer),
       public.refresh_dog_heat_forecast(uuid), public.evaluate_pairing(uuid,uuid)
       to authenticated, service_role;

revoke execute on function public.purge_old_audit_log()    from public, anon, authenticated;
revoke execute on function public.purge_old_error_events() from public, anon, authenticated;
grant  execute on function public.purge_old_audit_log(), public.purge_old_error_events()
       to service_role;
```

An anonymous caller could previously **switch off the audit log**, purge it, and merge contact
records while naming someone else as the actor. It was executed for real against production and
rolled back — this is not theoretical.

---

## 2 · Guards inside the functions, not just grants

Revoking `anon` closed the internet. It did **not** close a logged-in client: `merge_contacts`,
`pause_audit`, `resume_audit`, `set_audit_change_note`, `sweep_error_consistency` and
`generate_due_check_ins` are all still callable by any portal account.

**`CREATE OR REPLACE` each one, preserving the existing body exactly, with this as the first
statement:**

```sql
if not public.is_admin() then
  raise exception 'admin only' using errcode = '42501';
end if;
```

**Preserve `SECURITY DEFINER`, the `search_path` setting, and the argument signature.** Print the
existing body with `pg_get_functiondef` before you edit, and diff after — an accidental body change
here breaks contact merging or the audit trail silently.

**Do not add this guard to `refresh_dog_heat_forecast` or `evaluate_pairing`.**
`refresh_dog_heat_forecast` is invoked by the `trg_refresh_heat_forecast` trigger, and a guard would
fire during ordinary writes. `evaluate_pairing` is read-only.

### `claim_my_records()` — close the NULL trap

It has no `auth.uid() is null` check. Add one as the first statement, returning early rather than
raising — it runs on every sign-in and must not throw.

**Why this specific check:** for an anonymous caller `auth.uid()` is NULL, and `x <> auth.uid()`
evaluates to NULL rather than true, so a guard written that way never fires. Reject NULL explicitly,
then use `IS DISTINCT FROM`.

---

## 3 · Rate limiting — in the database, not in middleware

`applications`, `enquiries`, `error_events` and `signup_failures` accept anonymous inserts with **no
throttle of any kind**. One script can file unlimited applications tonight, each carrying uploads.

**Enforce it in Postgres.** Supabase exposes PostgREST directly at `/rest/v1/…`, so anything
enforced only in a Next.js route or in Expo is bypassed by posting straight past it. Middleware is
convenience; the database is the control.

```sql
create table if not exists public.rate_limit_buckets (
  key           text primary key,   -- sha256(fingerprint || ':' || action). NEVER a raw IP.
  action        text not null,
  window_start  timestamptz not null default now(),
  hit_count     int not null default 1,
  blocked_until timestamptz
);
alter table public.rate_limit_buckets enable row level security;
-- no policies: reachable only through the SECURITY DEFINER function below
```

`check_rate_limit(p_action text, p_key text, p_max int, p_window_seconds int) returns boolean`,
`SECURITY DEFINER`, pinned `search_path`, granted to `anon, authenticated, service_role`.
**Grant it — do not revoke anything.**

Called from the insert path for:

| Action | Limit |
|---|---|
| Application submit | 3 / hour, 5 / day |
| Enquiry / contact | 5 / hour |
| Sign-in failure | 10 / 15 min, then 15 min lockout |
| Document upload | 20 / hour |
| `error_events` insert | 60 / hour |

**The key is a salted hash of IP + user-agent. Store no raw IP address anywhere** — not in a column,
not in a log line. New server-only env var `RATE_LIMIT_SALT`. **Not** `NEXT_PUBLIC_`, and not the
same value as `ANALYTICS_SALT`.

**A blocked human always gets a way through:** *"Too many attempts — try again in 12 minutes, or
WhatsApp us on …"* Limits are deliberately generous. A blocked real buyer costs far more than a spam
row.

Add a cleanup that deletes buckets older than 24 hours.

---

## 4 · The app

The app posts to the same database, so **a limit enforced only on the website is not a limit**.

- Application submit, enquiry and document upload in `diedericks-dobermanns` all call `check_rate_limit` before inserting.
- Same blocked-message wording, same WhatsApp fallback.
- Confirm the app reads documents through the same scoped storage policy — a client must not see another client's files there either. Test it.

---

## Rules

- **Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.** Grant, never revoke.
- Rate limits live in Postgres. Middleware may duplicate them; it may not replace them.
- No raw IP addresses stored or logged, anywhere.
- `RATE_LIMIT_SALT` is server-only and distinct from `ANALYTICS_SALT`.
- Function bodies are preserved exactly when adding guards — diff them.
- The migration is idempotent; it is already applied live.
- No file over 300 lines. `requireAdmin()` on every admin route.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste the actual output, not a description

**Run every exploit inside `begin; … rollback;`.** Reading a policy is not proof — the storage hole
looked plausible on paper and was fully exploitable in practice.

- [ ] Applying the migration to a **fresh** database reproduces both live fixes. Applying it to the live database changes nothing and errors nowhere.
- [ ] As `anon`: `select public.pause_audit('x')` raises `42501`. Paste the error.
- [ ] As `anon`: `purge_old_audit_log()` and `merge_contacts(…)` both refused.
- [ ] As a **real client JWT** (use `a98377fd-5fe8-4494-beb3-fe127343c1e7`): 0 rows from `storage.objects` under another user's folder, and 107 rows still visible under `dog/`. Paste both counts.
- [ ] As that same client: `merge_contacts` and `pause_audit` now raise `42501` — the internal guard, not the grant.
- [ ] As an **admin**: contact merging, audit pause/resume and check-in generation all still work. **Exercise them through the UI, not just SQL.**
- [ ] `has_function_privilege('anon','public.is_admin()','execute')` is still **true**.
- [ ] Anonymous visitor still reads 31 dogs and 2 litters. The public site loads. A client portal loads and shows that client's own documents.
- [ ] A 4th application submit within an hour is refused with a readable message and a WhatsApp fallback.
- [ ] **The limit holds when posting directly to `/rest/v1/applications`, bypassing Next.js.** Paste the curl and the response. This is the one that matters.
- [ ] 11 failed sign-ins lock out; the correct password works again after the window.
- [ ] `grep -ri "req.ip\|x-forwarded-for\|x-vercel-ip" src app lib` — no raw IP reaches any table or log.
- [ ] `RATE_LIMIT_SALT` is set, server-only, and differs from `ANALYTICS_SALT`.
- [ ] `claim_my_records()` called with no session returns cleanly and writes nothing.
- [ ] App: rate limiting enforced on submit and upload — test **from the app** and paste the result.
- [ ] App: a client cannot read another client's documents.
- [ ] For each app file, `ls` the path and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] The migration is applied and confirmed against the live database before you report done.
- [ ] After every grant or policy change: **load the live public site and a live client portal.** Verify the site, not the policy text.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: migration, function guards, rate limiting, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
