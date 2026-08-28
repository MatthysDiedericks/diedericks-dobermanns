# CURSOR PROMPT — A sign-in link must not be spent by anything except a deliberate tap

Josef Kotse was invited at **06:52:06** on 26 Aug 2026. The token was consumed at **06:53:03**. He
tapped at **06:53:35**, **06:53:48** and **06:54:32** and got *"This link has expired"* every time.
He then WhatsApped Matt to say his link was broken. He is a buyer collecting a puppy in under two
weeks.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The evidence, and what it does and does not prove

```
portal_invites   invited_at 06:52:06   opened_at 06:53:04
auth.users       last_sign_in_at       06:53:03
auth.sessions    created_at 06:53:03   user_agent "node"   ip 13.247.84.59
error_events     INVITE_EXPIRED_USED @ 06:53:35, 06:53:48, 06:54:32
```

**Certain:** the token was verified successfully at 06:53:03, and every later tap failed because it
was already spent.

**Not knowable from here:** who made that first request. `user_agent: "node"` and the AWS Cape Town
IP are **our own server** — `/portal/auth/confirm` runs `verifyOtp` server-side, so *every* sign-in
looks identical regardless of who triggered it. Do not build anything on the assumption that it was
a bot, and do not build anything on the assumption that it was Josef.

**Two candidates, one fix.** Both are real, both are common, and the change below closes both:

1. **A link preview consumed it.** WhatsApp, Outlook Safe Links, Slack and iMessage all fetch a URL to render a preview card. A plain `GET` on our confirm route is indistinguishable from a human arriving.
2. **The in-app browser dropped the session.** Josef's screenshot shows **◀ WhatsApp** in the status bar — he was in WhatsApp's in-app browser. The route signs him in and sets the cookie *there*; a handoff to Safari, or the in-app browser's cookie handling, then leaves him with no session. He taps again and the token is gone.

---

## 1 · Never verify the token on GET

`src/app/portal/auth/confirm/route.ts` calls `supabase.auth.verifyOtp({ type, token_hash })`
directly in `GET`. **That is the bug.** Any fetch of that URL — by anyone, for any reason — burns a
one-time credential.

Replace it with a two-step:

- `GET /portal/auth/confirm` renders a page. It reads `token_hash` and `type` from the query and **verifies nothing**. A preview bot fetches this, sees markup, and consumes nothing.
- The page shows the kennel mark and one primary action: **Sign in to your portal**.
- Pressing it POSTs the token to a server action that runs `verifyOtp`, then redirects into `/portal`.
- **No auto-submit, no `useEffect` that fires the POST on mount, no meta refresh.** Those defeat the entire change — a headless preview renderer will run them.

Keep the friendly failure behaviour exactly as it is: a spent or genuinely expired token still lands
on `/portal/invite-expired`, which is well-written and worked correctly throughout this incident.

## 2 · Say which thing went wrong

`ERROR_CODES.INVITE_EXPIRED_USED` currently covers both *expired* and *already used*, and the page
says **"This link has expired"** for both. For Josef it was wrong and unhelpful — his link was
minutes old.

- Distinguish **used** from **expired** in the log and on the page.
- **Already used, and that user has a live session** → *"You are already signed in"* with a button straight to `/portal`. Never a dead end.
- **Already used, no session** → *"This link has already been used — ask Matt for a new one."*
- **Genuinely expired** → the current wording is fine.

## 3 · Survive the in-app browser

This is the case that most likely bit Josef, and it will keep happening — clients open links from
WhatsApp.

- After a successful sign-in, land on a portal page that **proves** the session took: greet him by name and show his dog. If the session did not stick, that page must offer a way back in rather than bouncing to a login screen with no explanation.
- Set the auth cookie with `SameSite=Lax`, `Secure`, and a **host-wide path** so an in-app browser handing off to Safari has the best chance of carrying it.
- On the expired page, add a quiet line: *"Opened from WhatsApp? Tap ⋯ and choose Open in browser."* One sentence, no lecture.

## 4 · Prefer a code over a link

A 6-digit code cannot be previewed, cannot be prefetched, and survives the person switching from
their phone to their laptop halfway through.

- The app already has this: `verifySignupOtp` in `diedericks-dobermanns/lib/auth.ts` and `app/(public)/verify-code.tsx`. **Reuse that path — do not build a third auth route.** `lib/auth.ts` carries an explicit comment not to add a second magic-link path; honour it.
- Make the admin invite panel offer **both**: a link and a code, from the same invite. Matt reads the code out on the phone when a client is stuck.
- Codes are single-use and short-lived, and that is fine — nothing fetches them.

## 5 · Stop guessing next time

Add enough to `portal_invites` to answer "who opened this" without a forensic session.

- Record the **client** user agent and IP on the confirm request (`request.headers`), not the server's. That is what was missing here and it cost an hour.
- Record whether the request was a `GET` render or the actual `POST` verification.
- Surface on the admin invite panel: *"Link opened 06:53 — not yet signed in"* versus *"Signed in 06:53"*. Matt could then have seen the problem in one glance.

---

## The app

- Same two-step confirm — the app opens portal links too.
- Same used-versus-expired wording.
- The app's own OTP screen becomes the recommended route for a stuck client.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- `GET` never verifies a token. Ever.
- No auto-submit, no `useEffect` POST on mount, no meta refresh on the confirm page.
- Used, expired and already-signed-in are three different messages.
- No password is generated, sent or displayed. Standing rule.
- Nothing auto-sends to a client. Matt presses send.
- Do not rewrite `/portal/invite-expired` — it behaved correctly.
- Reuse the existing OTP path; no third auth route.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] `curl` the confirm URL. It returns a page and **the token is still valid afterwards** — then complete the sign-in in a browser. Paste both steps. **This is the whole prompt; if this fails nothing else matters.**
- [ ] Fetch the confirm URL **five times** with `curl`, then sign in successfully. Paste the result.
- [ ] Send a real invite link into a WhatsApp chat, let the preview render, **then** tap it. It signs in. Say which device.
- [ ] Tapping a second time shows *"You are already signed in"* with a working button to `/portal`, not an expiry page.
- [ ] A token that is genuinely past its lifetime shows the expired wording, and the log records `expired` — not `used`.
- [ ] `error_events` now distinguishes the two. Paste one row of each.
- [ ] Opening from the WhatsApp in-app browser lands on a portal page that names the client and shows their dog. Screenshot.
- [ ] The admin invite panel shows "opened but not signed in" as a distinct state from "signed in". **Josef sat in exactly that state.**
- [ ] `portal_invites` records the client user agent and IP, not the server's. Paste a row — it must not say `node`.
- [ ] The invite panel offers a 6-digit code alongside the link, and the code signs in.
- [ ] **Invite Josef Kotse for real and confirm he reaches his portal** — Puppy 1 (Pink) and quote DD-1146 are already attached to him.
- [ ] App: same two-step confirm and wording. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Note

`CURSOR_PROMPT_INVITE_SPLIT_CLIENT_FIX.md` is running separately and covers the duplicate-contact
trigger and quote linking. **This prompt does not touch `sync_user_to_contacts()`, `contacts`, or
`quotes.client_id`.** If both are open at once, land that one first — it changes data, this one
changes an auth route.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the two-step confirm, used-versus-expired messaging,
in-app browser handling, the code option, invite diagnostics, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
