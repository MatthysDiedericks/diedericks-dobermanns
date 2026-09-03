# CURSOR PROMPT — Stop the daily failure email repeating errors that are already fixed

Matt gets the same failure digest every morning. On 3 Sep the digest carried **81 unresolved
events**. Exactly **four** of them were live. The other 77 last occurred between 18 and 31 August and
were already fixed in code — nothing ever marked them resolved, so they were re-sent every day until
they stopped meaning anything.

**Do section 1 first.** It is the cause. Sections 2 and 3 only hold once severity is honest.

**The 77 stale rows are already closed** (done by hand on 3 Sep, each with a resolution note saying
why). Do not re-close them and do not touch `resolved_at` on existing rows. Your job is to stop the
backlog rebuilding.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`. `codes.ts` exists in both and must
stay byte-identical apart from the cross-reference comment.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.

---

## 1. Severity is defaulting to "error" for everything

`src/lib/errors/logError.ts` line 72:

```ts
severity: input.severity ?? "error",
```

Every call site that omits `severity` is logged as an error. That is how these reached the digest:

| Code | What it actually is | Logged as |
|---|---|---|
| `PAYMENT_PROOF_UPLOADED` | a client successfully uploading proof of payment | error |
| `AUTH_REGISTRATION_BLOCKED` | invite-only registration working as designed | error |
| `INVITE_EXPIRED` / `INVITE_USED` / `INVITE_CODE_WRONG` / `INVITE_NONE_ISSUED` | a client mistyping or reusing a link | error |
| `SIGNIN_LINK_EXPIRED` / `SIGNIN_LINK_USED` | same, on the magic-link path | error |

**Fix:** severity belongs to the code, not the call site. In `src/lib/errors/codes.ts` add a
`CODE_SEVERITY: Record<ErrorCode, ErrorSeverity>` map covering **every** code in `ERROR_CODES` — type
it so a missing entry is a compile error, not a silent default. Then in `logError.ts`:

```ts
severity: input.severity ?? CODE_SEVERITY[input.code as ErrorCode] ?? "error",
```

Assign it as follows.

- **`warning`** — anything caused by a person doing something wrong, or by a bot: all `INVITE_*`
  redemption failures, `SIGNIN_LINK_*`, `AUTH_REGISTRATION_BLOCKED`, `AUTH_RATE_LIMIT`,
  `SECURITY_TOKEN_INVALID`, `SECURITY_HONEYPOT`, `SECURITY_RATE_LIMIT`, `APPLY_HONEYPOT`,
  `APPLY_TOO_FAST`, `APPLY_RATE_LIMITED`, `APPLY_VALIDATION_FAILED`, `QUOTE_VALIDATION_FAILED`.
- **`error`** — the system failed at something it should have done: `*_SAVE_FAILED`,
  `*_SEND_FAILED`, `*_UNHANDLED`, `APPLY_DB_ERROR`, `ADMIN_QUERY_FAILED`, `PORTAL_CLAIM_FAILED`,
  `CONTRACT_SIGN_FAILED`, `UPLOAD_OBJECT_MISSING`, `AUTH_EMAIL_DELIVERY`, `AUTH_SIGNUP_PHANTOM`.
- **`critical`** — money or access is wrong: `QUOTE_TOTAL_MISMATCH`, `INVOICE_TOTAL_MISMATCH`,
  `PAYMENT_OVER_ALLOCATED`, `SECURITY_RPC_DENIED`, `SECURITY_AUTH_LOCKOUT`.

**`PAYMENT_PROOF_UPLOADED` is not an error at all.** It is a success notification that was put in the
error table to get Matt an alert. Leave it in `IMMEDIATE_ALERT_CODES` — he still wants to know within
the minute — but log it at `warning` and give it `area: "payment"`. Then in the digest, exclude it
from the failure count and list it under its own **"Payments received"** heading. A client paying must
never appear in a list titled failures.

Also drop `AUTH_REGISTRATION_BLOCKED` from `IMMEDIATE_ALERT_CODES`. It fired 8 times in one day for
behaviour that is deliberate.

## 2. Nothing ever resolves, so the backlog only grows

`sweep_error_consistency()` runs daily at 05:15 and does not close anything.

Add to it, in a **new migration** (next number in `supabase/migrations/`, copied byte-identical into
both repos — this project keeps one migrations folder per repo for one database):

- Auto-resolve any **`warning`** older than **7 days**, note
  `'Auto-resolved: warning, no recurrence in 7 days.'`
- Auto-resolve any **`error`** whose code has had **no new occurrence in 14 days**, note
  `'Auto-resolved: no recurrence in 14 days.'` Judge recurrence by the newest row for that code, not
  per row — otherwise a code that fires weekly never closes.
- **Never auto-resolve `critical`.** Money and access stay open until a person closes them.

## 3. The digest must be readable in five seconds

`supabase/functions/error-events-digest`. Right now it is a flat list, so four live events and 77 dead
ones look the same.

- Subject line carries the count of **unresolved errors and criticals only**:
  `System health — 4 open` / `System health — all clear`.
- **Send nothing when the count is zero and no payments arrived.** A daily email that says "nothing
  wrong" trains him to stop opening it.
- Group by code, newest first, with `n × CODE — last seen <date>` and one line of the most recent
  `message`. Not one block per row.
- Warnings go in a collapsed count at the bottom: `+ 12 warnings (invite links, rate limits)`. No
  detail.
- Payments in their own section, as above.

## 4. The one live failure: `ADMIN_QUERY_FAILED` on `/admin/invite`

Four events on 2 Sep 11:37–11:38. `portal_invite_states` raised `admin only` — its
`public.is_admin()` guard returned false while an admin was on the page.

**Do not "fix" this by weakening the guard.** I tested `is_admin()` against Matt's super_admin id with
a valid JWT and it correctly returns true, so the function is right and the call reached it without a
usable session. Granting `service_role` a bypass would hide that, and this function reads
`auth.users`.

Instead make the next occurrence name its own cause. In `fetchInviteStates`
(`src/lib/admin/portalInvite.ts`), before the RPC, read `supabase.auth.getUser()` and add to the
logged `detail`: whether a user was returned, that user's id, the `role` on their `public.users` row,
and the postgres error code. Then the next event says which of the three it was instead of leaving us
guessing.

Second, the page must not just render blank. `fetchInviteStates` returns an empty Map on failure and
the invite list silently shows nothing. Surface a visible admin-only notice — "Invite status could
not be loaded. The list below is incomplete." — so a failure is seen at the time, not the next
morning.

## Rules
- Do not change the wording of any existing resolution note.
- No new tables. `error_events` already has `resolved_at`, `resolved_by`, `resolution_note`.
- Do not revoke EXECUTE on any function used in an RLS policy. That caused a 6.7-hour outage on this
  project.
- TypeScript strict, no `any`, no file over 300 lines.
- `ls` every file you create and paste the output.

## Verify — paste output, not descriptions
- [ ] `select code, severity, count(*) from error_events where resolved_at is null group by 1,2;` —
      paste it. Expect **4 rows of ADMIN_QUERY_FAILED and nothing else**.
- [ ] Paste the full `CODE_SEVERITY` map.
- [ ] Prove the map is exhaustive: paste the compile error you get after deleting one entry, then
      restore it.
- [ ] Invoke the digest function by hand against today's data and paste the **rendered email body**.
- [ ] Invoke it again with zero open errors and confirm it sends nothing — paste the return value.
- [ ] Run the new sweep against a copy of the current data and paste how many rows it would close.
      Expect **0** — everything stale is already closed.
- [ ] Load `/admin/invite` as Matt and screenshot it. Paste any new `error_events` row it writes.
- [ ] `npx tsc --noEmit` clean on the website; on the app, no new errors beyond the known set — paste
      the count before and after.
- [ ] `node scripts/check-parity.mjs --strict` — paste the exit code. Must be `0`.
- [ ] `npm run preflight` passes in both repos.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Commit
One commit per section. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
