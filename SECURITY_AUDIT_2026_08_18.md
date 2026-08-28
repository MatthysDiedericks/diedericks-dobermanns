# Security audit — 18 August 2026

Live audit of the Supabase database, storage, RPC surface and both repos. Everything below was
tested against the production project `nlmwxodvquwbjinhhbmr`, not read off a policy file.

**Two critical holes were found and closed during the audit.** Both were exploitable at the time of
writing. Details and proof below.

---

## Fixed live during this audit

### 1. CRITICAL — Any client could read every other client's private documents

**`storage.objects` policy `Auth read documents` read:**

```sql
bucket_id = 'documents' AND auth.role() = 'authenticated'
```

That is the entire condition. **Any logged-in portal account could read every file in the
`documents` bucket** — contracts, ID documents, proof of payment. Shayista's payment notification
was sitting at `40600d35-…/proof_of_payment/…` readable by all eight client accounts, and by anyone
who registered a new one. Registration is open to the public.

This is the "path-blind storage reads" item left open on 31 July. It survived three weeks.

**Fixed.** Reads are now scoped: staff see everything, a client sees `dog/` and `kennel/` documents
and **only their own** `{user_id}/…` folder. Uploads are scoped the same way — a client could
previously write into any folder in the bucket.

**Verified with a real client JWT:**

| | before | after |
|---|---|---|
| Another client's private files visible | all of them | **0** |
| Dog documents still visible | 107 | **107** (no regression) |

### 2. CRITICAL — Anonymous visitors could switch off the audit log and merge contacts

Ten `SECURITY DEFINER` functions were executable by `anon` — meaning **any unauthenticated person on
the internet** could call them at `/rest/v1/rpc/`, and they run as the owner, bypassing RLS.

The dangerous ones:

| Function | What an anonymous caller could do |
|---|---|
| `pause_audit(text)` | **Switch off the audit trail.** Then act unlogged. |
| `resume_audit()` | Turn it back on to hide the gap |
| `purge_old_audit_log()` | **Delete audit history** |
| `purge_old_error_events()` | Delete the error trail |
| `merge_contacts(uuid,uuid,uuid)` | **Merge any two contacts** — destructive, and `p_actor_id` is caller-supplied, so the log names someone else |
| `set_audit_change_note(text)` | Write arbitrary notes into the audit trail |
| `evaluate_pairing(uuid,uuid)` | Read your full breeding/COI analysis for any two dogs |
| `generate_due_check_ins`, `sweep_error_consistency`, `refresh_dog_heat_forecast` | Mutate operational data |

**Proved, not assumed.** Executed as `anon` inside a transaction:

```
select public.pause_audit('EXPLOIT TEST') → succeeded
```

then rolled back.

**Fixed.** `EXECUTE` revoked from `public, anon`; granted to `authenticated, service_role`. The two
purge functions are `service_role` only — pg_cron runs as superuser and is unaffected.

**I checked first that none of these appear in any RLS policy expression** — all returned 0. That
matters: revoking `EXECUTE` on a function used inside an RLS policy took this site down for 6.7
hours in July. `is_admin()` and `is_trainer_or_above()` were deliberately left untouched.

**Regression check after the change:** anonymous visitors still read 31 dogs and 2 litters, and
`is_admin()` is still callable by `anon`. The public site is unaffected.

---

## Still open — ordered by severity

### Critical

| # | Finding |
|---|---|
| C1 | **No rate limit anywhere.** `applications`, `enquiries`, `error_events` and `signup_failures` all accept anonymous inserts with no throttle. One script can file unlimited applications tonight, each carrying file uploads. |
| C2 | **Leaked-password protection still disabled.** Supabase Dashboard, two minutes. Open since 31 July. Portal accounts hold contracts and ID documents. |
| C3 | **Any authenticated user can still call `merge_contacts`, `pause_audit`, `purge`-adjacent and forecast functions.** Anonymous access is closed; a logged-in client's is not. These need internal `is_admin()` guards, not just grants. |

### Important

| # | Finding |
|---|---|
| I1 | **`dog-media`, `gallery`, `training-videos` are public buckets.** Public *reads* are intended; public *listing* is not — the bucket contents can be enumerated. |
| I2 | **Any authenticated user can upload into `dog-media` and `gallery`** with no path restriction. |
| I3 | **No upload validation** — no type whitelist, no size cap, no magic-byte check. The application form accepts files from the public internet. |
| I4 | **`apply_marketing_opt_out(uuid)` is anon-callable with no guard.** Deliberately left open — the unsubscribe link in emails has no session, and breaking it would breach POPIA. It needs a signed token instead of a bare contact ID; today anyone can opt out any contact whose ID they can guess. |
| I5 | **`felicia03@rocketmail.com` holds `admin`.** Confirm or downgrade. |
| I6 | **`claim_my_records()` has no `auth.uid() is null` guard.** Low impact, but it is the exact NULL-safety trap that caused an earlier bypass. |

### Hardening

| # | Finding |
|---|---|
| H1 | No security headers audit — HSTS, nosniff, frame-ancestors, Permissions-Policy |
| H2 | No bot defence on public forms; `is_bot` exists but nothing acts on it |
| H3 | No admin-visible security log — blocks and failures are invisible |
| H4 | No documented backup/restore drill |
| H5 | Secrets scanning not enforced in CI |

---

## What was checked and found healthy

- **RLS is enabled with policies on every table in `public`.** No table is unprotected.
- **All 55 `SECURITY DEFINER` functions have a pinned `search_path`** — the July mutable-path finding is genuinely resolved.
- Only three tables accept anonymous inserts, and all three are intentional: `applications`, `error_events`, `signup_failures`.
- `documents`, `litter-media`, `broadcasts` and `contract-signatures` buckets are private.
- `contract-signatures` is correctly scoped per user by folder.
- Admin accounts: two. One expected, one to confirm (I5).

---

## Three prompts, in order

1. **`CURSOR_PROMPT_SECURITY_PHASE1_CRITICAL.md`** — rate limiting, function guards, and locking the migration in. Run today.
2. **`CURSOR_PROMPT_SECURITY_PHASE2_IMPORTANT.md`** — storage listing, upload validation, signed unsubscribe tokens.
3. **`CURSOR_PROMPT_SECURITY_PHASE3_HARDENING.md`** — headers, bot defence, security log, backups, CI secret scanning.

**Two things only Matt can do, both two-minute jobs:**

- Enable leaked-password protection: Supabase Dashboard → Authentication → Policies
- Decide on `felicia03@rocketmail.com`

---

## Note on the live fixes

Both fixes above are applied to the **live database only** and are not yet in a migration file. If
anyone reruns migrations from scratch, they will be lost. **Phase 1 captures both as a migration** —
that is the first thing in it.
