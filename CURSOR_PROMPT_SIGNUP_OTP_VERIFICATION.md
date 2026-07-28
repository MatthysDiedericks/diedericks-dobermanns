# Cursor Prompt — Replace Magic-Link Email Confirmation with a 6-Digit OTP Code

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**The problem, confirmed by live testing:** client sign-up currently confirms email via a clickable link (`lib/auth.ts`'s `signUpWithEmail()` sets `emailRedirectTo: 'diedericksdobermanns://verify-email'`). The confirmation itself succeeds server-side, but the browser then has to hand off to the app via that custom URL scheme — and that handoff is unreliable across browsers/devices (reproduced live: Firefox couldn't open it and showed a raw connection error, with the user having no idea their account was actually already confirmed). This will happen unpredictably to real clients too. Decision made: replace it with a 6-digit OTP code the client types into the app — no browser, no link, no deep-link handoff, works identically on every device.

**What's already built and correct — reuse, don't rebuild:**
- `lib/auth.ts`'s `signUpWithEmail()` — the actual `supabase.auth.signUp()` call and its error handling are fine. Only change needed: the `emailRedirectTo` option becomes irrelevant to the primary flow (see Task 1).
- `app/(public)/sign-up.tsx` — the form itself (name/email/password/confirm fields, validation) is correct. Only its post-submit behavior changes (Task 3).
- `stores/authStore.ts`'s `onAuthStateChange` handler and role-based redirect-after-login logic — reuse this as-is for what happens once OTP verification succeeds; don't build a second "where does this role go" redirect.
- `app/(public)/verify-email.tsx` — the deep-link landing screen. Keep it in the codebase as a graceful fallback (Supabase's default email template still includes the link unless Matt removes it — see the manual step below), but it's no longer the primary path. Don't delete it, don't rebuild it, just stop treating it as the main flow.

**Dead code to remove — confirmed unused:** `app/auth/register.tsx` is a second, orphaned sign-up screen. `app/(public)/login.tsx` links to `/(public)/sign-up`, not `/auth/register` — nothing routes here. Delete it and its route, after confirming (grep the whole repo for `auth/register`) nothing else references it.

---

## Task 1 — `lib/auth.ts`: adjust `signUpWithEmail()`

- Remove reliance on `emailRedirectTo` driving the primary flow (leave the option in place, harmless — Supabase still needs *some* redirect URL configured, and it's already allow-listed). The email Supabase sends will now show a 6-digit code (`{{ .Token }}`) once Matt updates the email template (manual step below) — no code change makes that happen, it's a dashboard content edit.
- Add a new function:
  ```ts
  export async function verifySignupOtp(email: string, token: string): Promise<AuthResult> {
    if (!supabase) return { error: DEMO_ERROR };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    return { error: error?.message ?? null };
  }
  ```
- Add a resend function:
  ```ts
  export async function resendSignupOtp(email: string): Promise<AuthResult> {
    if (!supabase) return { error: DEMO_ERROR };
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    return { error: error?.message ?? null };
  }
  ```
- Wire both into `hooks/useAuth.ts` the same way `signUp`/`signIn` already are (thin wrapper, `setIsLoading`, refresh the auth store on success via the existing `refresh()` pattern — check how `signIn` does it and match it, since a successful `verifyOtp` call also returns a session that needs the same store refresh).

## Task 2 — New screen: `app/(public)/verify-code.tsx`

- Receives `email` as a route param (passed from sign-up, see Task 3).
- A single prominent 6-digit code input (numeric keypad, auto-advance/auto-submit on 6 digits if that's a pattern already used elsewhere in the app for OTP-style input — check before building a new one; otherwise a plain numeric `Input` is fine, don't over-engineer this).
- "Verify" button calling the new `verifySignupOtp(email, code)`. On success, call the auth store's `refresh()` (same as Task 1) and let the existing root-layout role-based redirect take over — don't hand-roll a second redirect here.
- Clear error states: wrong code ("That code isn't right — check your email and try again"), expired code (Supabase's own error message is usually clear enough — surface it directly rather than inventing new copy).
- "Resend code" link/button below the input, calling `resendSignupOtp(email)`. Add a simple cooldown (e.g. 30s, disable the button and show a countdown) so it can't be spammed — check if a small reusable cooldown hook/pattern already exists in the codebase (e.g. anywhere else that does "resend" logic) before writing a new one.
- Brand-consistent styling matching `sign-up.tsx` and `login.tsx` (same `LoginLogo`/`BrandMark`, same dark background, same `Field`/`Input` components — reuse, don't reinvent).

## Task 3 — `app/(public)/sign-up.tsx`: change post-submit behavior

- Remove the `done` state / "Account Created — check your email, go to sign in" dead-end screen.
- On successful `signUp()`, navigate straight to `/(public)/verify-code` with `{ email }` as a param. The user should see the code-entry screen within a second of tapping "Create Account" — no intermediate screen, no dead end.

## Task 4 — Remove dead code

- Delete `app/auth/register.tsx`.
- Grep the whole repo (`app/`, `components/`, any nav config) for `auth/register` and confirm zero remaining references before deleting. If anything unexpected references it, stop and flag it rather than deleting blind.

---

## Manual step — NOT part of this Cursor prompt, Matt does this in the Supabase Dashboard

Supabase's default "Confirm signup" email template only shows the clickable link. For the OTP code to actually appear in the email body, go to **Authentication → Email Templates → Confirm signup** in the Supabase Dashboard and add `{{ .Token }}` somewhere visible in the template body, e.g.:

```
Your verification code is: {{ .Token }}

This code expires in 24 hours. If you didn't request this, you can ignore this email.
```

(The existing `{{ .ConfirmationURL }}` link can stay in the template too, as a fallback for anyone who prefers clicking — `verify-email.tsx` still handles it if it works. It just isn't the primary instruction anymore.)

---

## Critical warnings

- Do not remove or weaken any RLS policy, and do not change how `signInWithEmail`/`signOut`/`sendPasswordReset` work — only the signup confirmation path changes.
- `supabase.auth.verifyOtp` with `type: 'signup'` is the correct call for confirming a brand-new account's email — don't confuse it with `type: 'email'` (used for email-change flows) or `type: 'recovery'` (password reset).
- Keep `app/(public)/verify-email.tsx` working as a fallback — don't delete it, don't break the deep-link subscription it depends on (`lib/auth/deepLink.ts`).
- No file over 300 lines.

## Testing checklist

- [ ] Sign up with a new email → immediately lands on the code-entry screen (no dead-end "check your email" screen first)
- [ ] Entering the correct 6-digit code from the email logs the user straight into their portal home (role-based redirect works, matching what `login.tsx` does for a normal sign-in)
- [ ] Entering a wrong code shows a clear, specific error and lets them retry without leaving the screen
- [ ] "Resend code" sends a new email and enforces a cooldown
- [ ] The old deep-link (`verify-email.tsx`) still works if someone clicks the link instead of typing the code (test on a browser where the custom scheme handoff succeeds, e.g. Chrome on the same Android device as the installed app)
- [ ] `app/auth/register.tsx` is deleted and nothing in the app references it
- [ ] `npx tsc --noEmit` passes cleanly
