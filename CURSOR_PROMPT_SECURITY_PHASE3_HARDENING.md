# CURSOR PROMPT — Security Phase 3 (HARDENING)

**Run after Phases 1 and 2 are applied and verified.** Findings: `SECURITY_AUDIT_2026_08_18.md`.

Nothing here is an open hole. This is the layer that means the next hole is **seen, survivable and
recoverable** rather than discovered by a client.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## 1 · Bot defence on public forms

`page_views.is_bot` exists and **nothing acts on it.**

- **Honeypot field** — visually hidden, never named "honeypot" in the DOM. Filled means bot: return 200, write nothing. **Never show a human an error for this**, and never let the bot learn it failed.
- **Minimum fill time** — a six-step application completed in under 15 seconds is not a person.
- **Exclude `is_bot` traffic from every analytics figure.** Your Vercel image-optimization quota went over 5 000 this month; crawlers are part of that, and every funnel number is wrong until they are filtered out.

**No CAPTCHA.** It is a tax on real buyers and this is a premium brand. Honeypot plus timing plus
the Phase 1 rate limit stops the traffic that matters.

## 2 · Security headers

`next.config.ts`. **There is an existing CSP — extend it, never loosen it.** If something breaks
after adding these, fix the source rather than relaxing the header.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`X-Frame-Options: DENY` stops your portal being framed inside another site and clickjacked — a real
risk for a login page.

## 3 · A security log Matt can actually read

Every block from Phases 1–3 writes to the existing **`error_events`** table with a `SECURITY_`
prefix. **Do not create a new table.**

Codes: `SECURITY_RATE_LIMIT`, `SECURITY_HONEYPOT`, `SECURITY_UPLOAD_REJECTED`,
`SECURITY_AUTH_LOCKOUT`, `SECURITY_RPC_DENIED`, `SECURITY_TOKEN_INVALID`.

`/admin/security` — newest first, filter by code, 30-day count per type.

**An attack you cannot see is an attack you cannot answer.** Today every one of these fails
silently.

**Alert Matt immediately** on `SECURITY_AUTH_LOCKOUT` and on more than 20 `SECURITY_RATE_LIMIT`
events in an hour, through the existing immediate-alert path. Everything else waits for the daily
digest. **An alert that fires constantly is an alert nobody reads.**

## 4 · Secrets

- **`npx secretlint` or `gitleaks` in the GitHub Actions workflow**, failing the build on a hit.
- Audit both repos: no `SERVICE_ROLE` key in any `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable, no key literal in source, no `.env` committed. **Confirm `.env.local` and `.env` are in `.gitignore` in both repos.**
- List every server-only env var the site now needs, in one place: `ANALYTICS_SALT`, `RATE_LIMIT_SALT`, `UNSUBSCRIBE_SECRET`, the service role key, the Resend key.
- **Anything ever committed is compromised** even after deletion — git keeps history. If the scan finds a historical secret, say so plainly and tell Matt to rotate it. Do not quietly delete it and move on.

## 5 · Backups you have actually restored

Supabase takes daily backups. **A backup nobody has restored is a hope, not a backup.**

- Write `docs/RESTORE.md`: how to restore to a point in time, what breaks, how long it takes, and who to contact. Plain language — Matt may be reading it at 2am on a bad day.
- Confirm the retention window on the current plan and state it in the doc.
- Add a monthly reminder to the existing reminder system: *"Confirm the last backup restored cleanly."*
- Note which data is **not** in Postgres — storage objects — and how those are protected.

## 6 · Session and account safety

- Confirm portal sessions expire and refresh tokens rotate. State the current values; do not change them without saying why.
- Password change and email change both require the **current** password.
- On password change, invalidate other sessions.
- Show clients a **"last signed in"** line on their profile. It costs nothing and it is the single cheapest way for a real person to notice an account they do not recognise.

## 7 · Dependencies

- `npm audit --omit=dev` in both repos. Fix criticals and highs; **list moderates rather than silently upgrading them** — an unplanned major version bump the day before a litter goes home is its own kind of risk.
- Add `npm audit` to CI as a warning, not a hard failure.

---

## The app

- Same honeypot and timing checks on the app's application flow.
- Same session and password rules; same "last signed in".
- `/admin/security` as a **read-only summary** in the app — recent blocks and the 30-day counts. Filtering and detail stay on the website.
- Confirm no service-role key in any `EXPO_PUBLIC_` variable. Anything `EXPO_PUBLIC_` ships **inside the installed app** and can be read from the device.

## Rules

- Never loosen the existing CSP.
- No CAPTCHA.
- Reuse `error_events`; do not add a security table.
- Alerts stay rare enough to be read.
- A found secret is rotated, not deleted.
- Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`.

## Verify — paste output

- [ ] `curl -I https://diedericksdobermanns.com` shows all five headers, and the existing CSP is unchanged. Paste it.
- [ ] The site, portal, gallery and quote PDF all still work with the headers on.
- [ ] A filled honeypot returns 200 and writes nothing; a real submission is unaffected.
- [ ] An application completed in 8 seconds is refused; one completed normally is not.
- [ ] Bot traffic is excluded from every analytics figure — show the count with and without.
- [ ] Each of the six `SECURITY_` codes appears in `/admin/security` after being triggered once.
- [ ] A lockout alerts Matt within minutes; 5 rate-limit events in an hour do **not** alert.
- [ ] The secret scanner runs in CI and **fails a deliberately planted fake key**. Remove it afterwards.
- [ ] `.env` and `.env.local` are gitignored in both repos.
- [ ] `grep -r "SERVICE_ROLE" .` finds no match in any `NEXT_PUBLIC_`/`EXPO_PUBLIC_` variable or client bundle.
- [ ] `docs/RESTORE.md` exists and names the retention window on the current plan.
- [ ] Changing a password invalidates other sessions — test with two browsers.
- [ ] Email change requires the current password.
- [ ] "Last signed in" shows on the client profile in both website and app.
- [ ] `npm audit --omit=dev` in both repos — paste both summaries.
- [ ] For each app file, `ls` the path and paste it. Do not rely on grep.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.
- [ ] `git log origin/main -1` matches `HEAD` in both repos — paste both hashes.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: headers, bot defence, security log, secrets/CI, docs.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
