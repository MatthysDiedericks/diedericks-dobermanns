# CURSOR PROMPT — URGENT: sign-in hangs on "SIGNING IN…"

**A real client cannot get into her portal right now.** Felicia Nell presses Sign in, the button
changes to "SIGNING IN…", and it never changes back.

**Authentication is not the problem.** The Supabase auth log shows `POST /token → 200` and a
`Login` event at 10:18:36 and again at 10:22:03 UTC. She signed in successfully, twice. Everything
after that is where it fails.

**Repos:** `diedericksdobermann-web` (primary) and `diedericks-dobermanns` (check the same pattern).
**Supabase:** `nlmwxodvquwbjinhhbmr`.

---

## The bug — `src/app/portal/login/page.tsx`

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) { setError(...); setLoading(false); return; }

await supabase.auth.getSession();
try {
  await claimRecordsAfterSignIn();      // server action, awaited, blocks everything
} catch (err) {
  console.error("[PortalLoginPage] claim", err);   // invisible
}
router.replace("/portal");
router.refresh();
```

Three faults, compounding:

**1. `setLoading(false)` is never called on success.** The button can only reset when navigation
completes. If `/portal` is slow or throws, the label stays "SIGNING IN…" indefinitely — and the
client concludes the site is broken, when in fact she is already signed in.

**2. A server action is awaited before navigating.** `claimRecordsAfterSignIn()` is a
nice-to-have — it attaches records raised before the account existed. It must **never stand between
the user and their portal**. It is also idempotent and already runs after email confirmation, so
delaying it costs nothing.

**3. Its failure goes to `console.error`.** Nothing reaches `error_events`. The `PORTAL_CLAIM_FAILED`
outage earlier this week was invisible for 14 hours for exactly this reason.

## The fix

- **Navigate first.** `router.replace("/portal")` immediately after the session is confirmed readable.
- **Fire the claim without blocking** — after navigation, or on the portal page itself. If it fails, log to `error_events` with code `PORTAL_CLAIM_FAILED`. Never `console.error` alone.
- **Wrap the whole submit in `try/finally` with `setLoading(false)` in the `finally`.** The button must always reset, on every path, including exceptions.
- **Add a timeout.** If navigation has not happened within ~8 seconds, stop the spinner and show: *"You are signed in, but the portal is taking longer than usual. Open your portal"* with a direct link, plus the WhatsApp contact from `app_settings`. **A user who is signed in must never be left staring at a button.**

Apply the same three fixes to the **registration** and **password reset** forms — they share this shape.

## Then find out why `/portal` is slow or failing

`/admin` threw a Server Components error at 12:15 today, minutes before Felicia's attempts. Both are
authenticated pages. A shared fault is the obvious suspect.

- Read the Vercel logs for `/portal` and `/admin` between **10:00 and 10:30 UTC** and report what the actual error was, using the digest.
- Check what `/portal` renders for a client with a quote, an application, no dog and no contract — Felicia's exact state. **That combination may not have been rendered before.**
- If a portal query throws for that state, fix it and say which.

**Report the cause before changing anything beyond the login form.** Speculative fixes to a page
you have not diagnosed are how the next fault gets introduced.

## Check the app too

`diedericks-dobermanns` sign-in: same three questions. Does the loading state always reset? Is the
claim awaited before navigation? Does its failure reach the error trail?

---

## Rules

- The loading state resets on every path, without exception.
- Nothing optional blocks navigation after a successful sign-in.
- Every caught error reaches `error_events`; `console.error` alone is not logging.
- A signed-in user always has a way forward on screen.
- No file over 300 lines.

## Verify

- [ ] Signing in with valid credentials navigates to `/portal` and the button never stays on "SIGNING IN…".
- [ ] With the claim server action deliberately made to throw, sign-in still completes and an `error_events` row is written with `PORTAL_CLAIM_FAILED`.
- [ ] With the claim made to hang for 30 seconds, the user still reaches the portal.
- [ ] Simulating a slow `/portal` shows the timeout message with a working link and the WhatsApp contact.
- [ ] Wrong password still shows the invalid-credentials message and resets the button.
- [ ] The same three fixes are applied to registration and password reset.
- [ ] **Felicia Nell's exact state renders**: a client with a quote, an application, no dog, no contract sees a working portal — sign in as her, or reproduce the state on a test account.
- [ ] You have reported what the `/admin` and `/portal` errors actually were, from the Vercel logs.
- [ ] The app's sign-in resets its loading state and does not block on the claim.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

**Push the login fix on its own, first, before anything else.** A client is locked out; do not hold
it behind the investigation.

**Website:** from `diedericksdobermann-web/`. **App:** repo root is the **parent** folder. Push both,
then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
