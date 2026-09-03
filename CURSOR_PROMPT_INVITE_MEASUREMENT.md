# CURSOR PROMPT — Measure why clients cannot get into the portal (measurement only, no fix)

**This prompt deliberately changes no behaviour.** It only makes failures name themselves. Do not
"helpfully" fix the invite flow while you are in here — a separate prompt does that, and mixing the
two makes it impossible to tell whether the fix worked.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**Next free migration: `0147`.** (`0146_waitlist_payment_gate.sql` is the last on disk, both repos.)

---

## The problem, from the live database

```
portal_invites:  6 issued  ·  1 ever attempted  ·  0 ever redeemed
auth accounts:   7 clients ·  0 have ever signed in
```

Six invites, one attempt, zero successes. Five of the six were never even tried, which points at
delivery rather than code — but **we cannot prove that**, because every failure writes the same line:

```
INVITE_EXPIRED — "Invite code missing or expired"
```

Henko Burden failed at 07:16 on 1 Sep with an invite that is valid until 7 Sep. We do not know
whether he mistyped, was never sent the code, or hit a real bug. That is the gap to close.

### Why the current classifier cannot tell

`src/app/portal/auth/confirm/outcome.ts` → `classifyInviteFailure()` returns only
`"used" | "expired" | "signed-in"`, and **`"expired"` is the fall-through default**. On the 6-digit
code path there is no `inviteId` to inspect, so it skips every real check and lands on `expired` by
default. The label is not measuring anything; it is guessing.

---

## 1. Name the four real outcomes

Extend `InviteFailReason` to distinguish what actually happened:

| Reason | Means | What Matt should do |
|---|---|---|
| `wrong-code` | A valid unredeemed invite exists for this email; the digits did not match | Ask them to retype |
| `expired` | Invite exists, past `expires_at` | Issue a new one |
| `used` | Invite exists, already redeemed | They are in — send them to `/portal/login` |
| `no-invite` | **No invite row exists for this email at all** | They were never sent one — this is the bug |
| `signed-in` | Already has a session | Nothing |

`no-invite` is the one we most expect to see and currently cannot.

In `redeemInviteCode` (`src/app/portal/auth/confirm/actions.ts`), when the code lookup returns
nothing, look up the email's invites **before** classifying. A new `SECURITY DEFINER` RPC
`portal_invite_diagnose(p_email text)` returning the most recent invite's
`(exists, expires_at, code_redeemed_at, invited_at)` is the clean way — the anon caller must not be
able to read the table directly, and it must **not** return `code_hash` or anything that helps guess
a code. Then:

- row exists, not redeemed, `expires_at > now()` → **`wrong-code`**
- row exists, `code_redeemed_at` set → **`used`**
- row exists, expired → **`expired`**
- no row → **`no-invite`**

Add matching entries to `src/lib/errors/codes.ts`: `INVITE_CODE_WRONG`, `INVITE_NONE_ISSUED`.
Keep `INVITE_EXPIRED` and `INVITE_USED` — do not renumber history.

## 2. Record the attempt on the invite itself

Migration `0147`, byte-identical in both repos:

```sql
alter table public.portal_invites
  add column failed_attempts integer not null default 0,
  add column last_failed_at timestamptz,
  add column last_failed_reason text
    check (last_failed_reason is null or last_failed_reason in
      ('wrong-code','expired','used','no-invite'));
```

Stamp these from the server on every failed redemption where an invite row was found. Cap the
counter's usefulness honestly: it is a diagnostic, not a lockout — **do not add rate limiting or
blocking in this prompt.** `checkRateLimit` already guards issuance; leave redemption alone.

## 3. Show Matt who is stuck, on the dashboard

The helpers already exist and are **unused**: `isInviteStuck()`, `isConfirmedNeverSignedIn()`,
`isInvitedNotOpened()`, `formatInviteState()` in `src/lib/portal/inviteCopy.ts`, and the RPCs
`count_unopened_portal_invites` and `count_confirmed_never_signed_in`. Wire them up rather than
writing new ones.

A read-only card, **Clients who cannot get in**, on the admin dashboard:

- name, email, days waiting, and the state in plain words — "Invited 31 Aug, never opened",
  "Confirmed, never signed in", "Tried 1 Sep — wrong code", "**No invite ever issued**"
- sorted worst-first by days waiting
- each row links to that client
- if the list is empty, say so plainly rather than hiding the card — an absent card looks like a
  broken card

No buttons, no sending, no auto-issuing. This prompt observes; it does not act.

## 4. App parity

The app has the same confirm/code screens. Mirror the reason names and the error copy so the two
surfaces do not diverge — this is a standing rule on the project. The dashboard card is
website-only unless the app already has an admin dashboard to hang it on; say which you did.

---

## Rules
- **No behaviour changes.** Same flows, same emails, same rate limits. Only labelling, recording
  and a read-only panel.
- Never expose `code_hash`, and never return anything from `portal_invite_diagnose` that narrows a
  guess. It is called by `anon`.
- **Do not revoke EXECUTE on any function used in an RLS policy.** That caused a 6.7-hour outage on
  this project in July.
- Migration byte-identical in both repos. TypeScript strict. No file over 300 lines.

## Verify — paste output, not descriptions

The point of this prompt is that failures become legible, so the verification is: **produce each
failure on purpose and show the label it writes.**

- [ ] **`no-invite`:** attempt a code for an email with no invite row. Paste the `error_events` row.
      Confirm it reads `INVITE_NONE_ISSUED`, not `INVITE_EXPIRED`.
- [ ] **`wrong-code`:** take a real valid invite, submit the wrong digits. Paste the row. Confirm
      `INVITE_CODE_WRONG` and that `failed_attempts` incremented on that invite.
- [ ] **`expired`:** set a test invite's `expires_at` into the past, attempt it, paste the row.
- [ ] **`used`:** set `code_redeemed_at`, attempt it, paste the row.
- [ ] Delete every test invite you created and paste the row count before and after. **Cursor has
      previously left `VERIFY` rows attached to a real client on this project — do not repeat that.
      Use an `@example.invalid` address, never a real person's.**
- [ ] Screenshot the dashboard card with the **7 real stuck clients** on it. Their emails are in
      `auth.users` where `last_sign_in_at is null`.
- [ ] Confirm the card is read-only — no action buttons.
- [ ] As `anon`, call `portal_invite_diagnose` with a real email and paste what comes back. Confirm
      it contains no hash and nothing that helps guess a code.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on **`diedericksdobermanns-web-v145`**. The three duplicate projects were
      deleted on 1 Sep, so there is now exactly one project and a red build genuinely means broken.
- [ ] Migration `0147` applied live and present in both repos.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.

---

## What happens next, so you do not pre-empt it

Once this is live we watch the labels for a day, then a second prompt does the actual fix:
auto-issue an invite when an application is submitted, put the code in the confirmation email the
applicant already receives, and generate a one-tap WhatsApp link. **Do not build any of that here.**
