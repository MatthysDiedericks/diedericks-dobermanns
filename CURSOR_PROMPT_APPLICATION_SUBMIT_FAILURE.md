# CURSOR PROMPT — The application form is losing real buyers, and leaving no evidence

**No application has reached the database since 17 August 13:11 UTC.** A real client tried on
18 August at 21:20 UTC, got *"Could not submit your application."*, and gave up. That applicant is
gone and we do not know who they were.

**Diagnose first. Do not start fixing things you have not proved.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The evidence — verified against the live database, work from this

| Event | UTC |
|---|---|
| Last successful application (Jocelyn Makenzie) | **17 Aug 13:11** |
| Rate-limit triggers went live | 18 Aug **16:42** |
| `PORTAL_CLAIM_FAILED` — `cookies()` inside `after()` | 18 Aug **21:00, 21:02** |
| **Client sees "Could not submit your application."** | 18 Aug **21:20** |
| First `application` rate-limit bucket ever created | 19 Aug **06:00** |

**The decisive fact: there is no rate-limit bucket from 21:20.** The trigger writes a bucket row on
every insert attempt that reaches it. No row means **the insert never reached the database**. The
failure is upstream — in the route, before Postgres was ever asked.

**So the rate limit is NOT the cause of that failure.** It was a second, separate problem the
following morning, when three retries hit the old 3/hour ceiling. Do not "fix" the rate limiter and
declare victory.

**Already changed live** (capture these as migrations, see §4): application limits raised to
20/hour and 60/day, enquiries to 30/hour, and the blocking buckets cleared.

---

## 1 · Make the next failure visible — do this before anything else

**A form that fails silently for 36 hours is the actual defect.** Everything below is secondary.

In `src/app/api/apply/route.ts`, every path that returns anything other than success must write to
`error_events` **before** it returns, with a distinct code:

| Code | Meaning |
|---|---|
| `APPLY_VALIDATION_FAILED` | which field, and why |
| `APPLY_HONEYPOT` | honeypot filled |
| `APPLY_TOO_FAST` | minimum fill time not met — **record the actual elapsed seconds** |
| `APPLY_RATE_LIMITED` | `P0001` from the trigger |
| `APPLY_UPLOAD_FAILED` | file rejected, with the reason |
| `APPLY_DB_ERROR` | the Postgres `sqlstate` and message |
| `APPLY_UNHANDLED` | anything else, with the stack |

Record the step reached, the elapsed time, and a **redacted** payload shape — field names and whether
each was populated, **never the values**. Names, addresses and ID numbers do not belong in an error
log.

**The `log_security_event` calls were stripped out of `trg_rate_limit_insert` yesterday afternoon.**
Put them back, and this time the `SECURITY_%` bypass must survive: read the column as
`coalesce(to_jsonb(new) ->> 'code','')`, **never `new.code`** — that field exists only on
`error_events`, and SQL `AND` does not short-circuit, which is what took every public form offline
earlier. See `0102`.

**Then give the buyer something better than a dead end.** Replace *"Could not submit your
application."* with the specific reason where it is safe to say so, and always offer the WhatsApp
fallback:

> We could not submit your application — the phone number format was not accepted.
> Fix it and try again, or WhatsApp us on +27 78 215 0832 and we will take it down for you.

**Never let a buyer reach a message that offers no way forward.**

## 2 · Find the actual cause

With logging in place, reproduce it. Prime suspects, in order:

**The minimum fill time.** A six-step form completed in under 15 seconds is meant to be a bot. But a
returning applicant who refreshes, or one who prepared their answers, can trip it. **Check what the
threshold measures** — if the clock starts on the final step rather than the first, a careful human
who spent twenty minutes on the form looks instant. **Log the elapsed seconds either way.**

**The honeypot.** Confirm it is not visible to screen readers, autofill, or password managers.
A field a browser fills automatically is a field that silently rejects real people.

**The route was unhealthy at exactly that moment.** `cookies()` inside `after()` fired at 21:00 and
21:02, eighteen minutes before the client's attempt. Fix that error and check whether the same
pattern exists in the apply route.

**Validation.** Compare every client-side rule against the database constraints. `applications.country`
is `NOT NULL` — confirm the form always sends it. The ID validation must **flag, never block**.

**Report what you actually found.** If it turns out to be none of these, say so and show the log
entry that proves it. **Do not guess and move on** — this has now cost at least one buyer.

## 3 · Fix the rate-limit key properly

The key is `sha256(salt : x-forwarded-for : user-agent : action)`. When the insert comes through a
server route, those headers are **the server's**, so every applicant collapses into one bucket. The
data shows it: `application` had **1 distinct key**, `error_events` — written from the browser — had
**9**.

Forward the real client IP from the route into the rate-limit call and key on that.

**Then prove it:** two different browsers or devices must produce **two different keys**. Paste both.

### The limits are sized for the whole business, not one person — do not tighten them

**Matt gets 10–15 enquiries in a weekend burst.** While the key is shared, every ceiling is a
ceiling on the entire business at once, so it must clear his busiest hour with room to spare.

Current live values, raised 19 Aug:

| Action | Limit |
|---|---|
| Application | **50 / hour**, 200 / day |
| Enquiry | **100 / hour** |
| `error_events` | 300 / hour |
| Sign-in failure | **60 / 15 min** |

Verified live: 20 enquiries and 10 applications submitted back to back were **all accepted**.

Sign-in was raised deliberately — a shared key meant 10 failures from *anyone* would have locked out
**every client at once**. Supabase Auth has its own per-IP throttle underneath this.

**Only tighten these after the key is genuinely per-person, and say so explicitly when you do.**
A limit that turns away a real buyer costs far more than the spam it prevents, and the honeypot plus
the minimum fill time are the actual bot defence here.

## 4 · Capture last night's live changes as migrations

None of these are in a file. A migration replay loses them:

- The raised limits and the removal of the broken `SECURITY_%` guard from `trg_rate_limit_insert` (applied live 18 Aug).
- Confirm `0102` matches the live function afterwards — **right now the ledger says it is applied and the bodies differ**, which is drift nobody will notice.
- Record `0095b_drop_public_media_list` in the ledger; it is still missing.

Every migration must be **idempotent** — these are already applied.

## 5 · Correct the restore runbook

`docs/RESTORE.md` claims the *"Pro plan's 7-day backup window"*. **The project is on the Free plan**
and Matt has decided to stay there for now. Free has no point-in-time recovery.

Correct it to describe what actually exists. **A runbook that overstates what is recoverable is read
for the first time at 2am, on the worst day, and it will be wrong then.**

---

## The app

The app submits applications too, and it posts to the same database.

- Same structured error codes written to `error_events` from the app's submit path.
- Same specific messages with the WhatsApp fallback — **never a raw Postgres string**.
- Confirm the app's submit is not subject to the same shared-key problem.

`ls` each file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

---

## Rules

- Diagnose before fixing. Prove the cause with a log entry.
- Never `new.code` in that trigger — use `to_jsonb(new) ->> 'code'`.
- No applicant PII in `error_events` — field names and presence only.
- Every failure path logs before it returns.
- Every failure message offers a way forward.
- Flag, never block, on ID validation.
- Migrations are idempotent; they are already applied live.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output for every line

- [ ] **Submit a real application end to end on the live site. It succeeds and appears in `applications`.** Paste the row. This is the only test that matters.
- [ ] Each failure path writes its own code to `error_events` — trigger all seven and paste the rows.
- [ ] No applicant name, address, phone, email or ID appears in any `error_events` row. Show one.
- [ ] You have named the actual cause of the 18 Aug 21:20 failure, with the evidence.
- [ ] The minimum-fill-time threshold is stated, and you have said what it measures from.
- [ ] A genuine slow completion (20+ minutes) is accepted.
- [ ] The honeypot is invisible to autofill and screen readers.
- [ ] Two different devices produce two different rate-limit keys. Paste both hashes.
- [ ] 20 applications in an hour succeed; the 21st is refused with the friendly message and WhatsApp fallback.
- [ ] `SECURITY_RATE_LIMIT` rows appear in `error_events` when a block fires — they do not today.
- [ ] `error_events` inserts with a `SECURITY_` code still bypass the limit.
- [ ] Enquiries and sign-in still work — the same trigger covers them.
- [ ] `0102` matches `pg_get_functiondef` on the live database. Diff them.
- [ ] `0095b` is recorded in the ledger.
- [ ] `docs/RESTORE.md` describes the Free plan accurately.
- [ ] App: same codes, same messages — test a failure from the app and paste the row.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build succeeded — state the deployment status.
- [ ] **Committing is not shipping.** Four commits sat unpushed yesterday and none of that work was live.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: error instrumentation, the root-cause fix, the rate-limit
key, migration capture, docs.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
