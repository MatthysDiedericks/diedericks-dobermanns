# CURSOR PROMPT — Fix the seven real failures still open on System Health

The health page was showing 17 open error groups. **Eleven were probe and test events from
development runs** — `cursor-collide-…@example.com`, `_quote-error-probe.ts`, `DD-PROBE`, and one
literally messaged *"bypass probe — delete me"*. Those were marked resolved on 26 Aug 2026.

**Seven remain and all of them are real.** Two are clients who were blocked and gave up.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

> **Already covered elsewhere — do not touch these.** `INVITE_EXPIRED_USED` (4 events,
> `topproducts.co.za`, Josef) is handled by `CURSOR_PROMPT_SIGNIN_LINK_CONSUMED_ON_GET.md`.
> The duplicate-contact work is in `CURSOR_PROMPT_INVITE_SPLIT_CLIENT_FIX.md`. Both are running.

---

## 1 · `PORTAL_CLAIM_FAILED` — 35 events, the biggest real failure you have

```
Route /portal/quotes/[id] used `cookies()` inside `after()`. This is not supported.
```

Every client who opened a quote in their portal on 17–18 Aug hit this. It is a genuine Next.js
defect, not a data problem: `cookies()` cannot be called inside an `after()` callback.

`src/lib/portal/claimRecords.ts` runs `claimMyRecordsAndFlash`, which sets a flash cookie. Something
on the quote route calls it from inside `after()`.

- Read the cookie **outside** the callback and pass the value in, exactly as the Next.js error says.
- **Audit every `after()` in both repos** for the same pattern, not just this route.
- `claim_my_records()` failing silently means a client's quote never attaches to their login. That is the same class of problem as the Josef incident, arriving by a different door — so it must fail **loudly** into `error_events`, never be swallowed.

## 2 · `AUTH_REGISTRATION_BLOCKED` — 8 events, all real people, all gmail.com

```
Password should contain at least one character of each: a-z, A-Z, 0-9, !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
```

Eight self-registrations at `/portal/register` failed the password rule and did not come back. That
is eight buyers who tried to create an account and gave up.

**This is a settings decision as much as a code one.** Supabase currently enforces 12 characters plus
upper, lower, digit and symbol. Matt's buyers include people who struggle with online forms — the
rule is the wall they hit.

- Report what the policy is set to now and what the shortest safe change would be. A **12-character minimum with no character-class requirement** is stronger against real attacks than 8 characters with four classes, and far easier to type. Recommend it; let Matt decide.
- Regardless of the policy, **the error must be readable**. Never print the raw symbol list. Say what is missing and what to add, as it is typed: *"Add a number"*, *"Add a capital letter"*.
- The checklist fixed on 17 Aug must reflect the live policy, not a hardcoded copy of it. If they disagree, the checklist lies.
- Offer the passwordless route from the register page: *"Rather have a link sent to you?"* Passwords stay optional, as they already are for invites.

## 3 · `APPLY_UNHANDLED` — 10 events

```
TypeError: Failed to parse body as FormData
```

At `/api/apply`, `step_reached: "parse"`. The request body could not be read at all — the applicant
never reached validation.

- Reproduce before you change anything. Ten events in one day on a public form is either a real submission path or a scanner; **`step_reached` and `elapsed_seconds` will tell you which.**
- Whatever the cause, an unreadable body must not produce a silent failure for a real applicant. Show the friendly retry, keep their answers, and log the distinction.

## 4 · `APPLY_DB_ERROR` — 2 events, `sqlstate 23503`

A foreign-key violation on insert, with `specific_dog_id` populated. Almost certainly an application
pointing at a dog that no longer exists or is not selectable.

- Validate the referenced dog **before** insert, and tell the applicant plainly if it has gone: *"That puppy is no longer available — pick another or tell us what you're after."*
- Never lose a completed 35-field application to a foreign key. Both of these took over 25 minutes to fill in — `elapsed_seconds` was 1513.

## 5 · `SECURITY_TOKEN_INVALID` — 5 events at `/unsubscribe`

Five unsubscribe tokens rejected. Either the links are being mangled in email, or the tokens expire
too aggressively.

- POPIA requires unsubscribe to work **without a login**. A rejected token that dead-ends is a compliance problem, not just a bug.
- An invalid token must still offer a way out — an email box that unsubscribes on confirmation.

## 6 · `PAYMENT_PROOF_UPLOADED` — logged as an error, isn't one

*"Proof of payment uploaded for DD-1146"* is a **success**, filed at `error` severity. It clutters
the page and trains Matt to ignore it.

- Re-file as `info`, or drop it from `error_events` and put it in the audit trail where it belongs.
- Then sweep the codebase: **any other success or informational event logged at `error` or `warning`.** Name every one you find.

## 7 · Keep the page trustworthy

The reason 11 probe events sat there for a week is that nothing distinguishes a test from a client.

- Add an `is_test` boolean, defaulting false, set by any probe script or seeded verification.
- **Never log a probe as a real event again.** Same rule as the `__verify_0119_override_` row that reached the live litter list.
- Default the health page to hiding resolved and test events, with a toggle.
- Show **people affected** as distinct from event count — the page already does this and it is the most useful number on it.

---

## The app

- The `after()`/`cookies()` audit applies to the app's server code too.
- Same readable password messages on the app's register screen.
- Same friendly retry on a failed application submit.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Do not touch `INVITE_EXPIRED_USED` or the contact-duplicate work — other prompts own those.
- Never print a raw symbol list to a client.
- Never lose a completed application to a validation or FK error.
- Unsubscribe always works without a login.
- Success events never log at `error` severity.
- Probes are marked as tests, never logged as real.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Open a quote in the portal as a real client. **No `PORTAL_CLAIM_FAILED`.** Paste the route and the empty log.
- [ ] List every `after()` in both repos and confirm none calls `cookies()` inside. Paste the list.
- [ ] `claim_my_records()` failing now writes a loud event. Force one and show it.
- [ ] State the current Supabase password policy and what you changed it to, if anything.
- [ ] A password missing a digit shows *"Add a number"* — **not** the symbol list. Screenshot.
- [ ] The register checklist matches the live policy. Show both.
- [ ] `/portal/register` offers the passwordless option.
- [ ] Reproduce `APPLY_UNHANDLED` and say whether it was a real submission or a scanner. Show your reasoning.
- [ ] An application naming an unavailable dog gets a readable message and **keeps its answers**. Screenshot.
- [ ] An invalid unsubscribe token still lets someone unsubscribe. Screenshot.
- [ ] `PAYMENT_PROOF_UPLOADED` no longer appears as an error. Name every other mis-filed severity you found.
- [ ] `is_test` exists; a probe run does not appear on the default health view.
- [ ] `select code, count(*) from error_events where resolved_at is null group by code` — paste it. **Expect only genuine, current failures.**
- [ ] App: same fixes. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the `after()`/`cookies()` fix, password policy and messaging,
apply-route resilience, unsubscribe, severity cleanup, `is_test`, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
