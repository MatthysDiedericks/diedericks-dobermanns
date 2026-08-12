# CURSOR PROMPT — Client registration (URGENT: buyers cannot create accounts)

**This is live and broken right now.** The website portal has a login page,
forgot-password and reset-password — and **no way to register**. Every approved buyer is
emailed *"create your portal account using this same email address"* with a link to
`/portal/login`, arrives, and finds nothing but a sign-in form.

Daron Naidoo received exactly that email this morning, along with quote DD-1133.

**Repos:** `diedericksdobermann-web` (primary) and `diedericks-dobermanns` (check only).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The linking is already built — do not rewrite it

`claim_my_records()` was applied on 11 Aug 2026. Call it; do not reimplement it.

```
claim_my_records() returns (applications int, quotes int, waitlist int, contracts int)
```

It links the calling user to any application, quote, waiting-list entry or contract
already raised against their **confirmed** email address. Safe to call repeatedly — it
only ever fills a NULL.

**This matters because the records exist before the account does.** A buyer applies, is
approved, and is sent a quote, all before registering. Right now **3 applications, 2
quotes and 4 waiting-list entries** have no account attached. Without calling this, a
buyer registers and lands in an empty portal, unable to find the quote they were just
emailed.

**Security, do not weaken it:** the function reads the email from `auth.users` for the
caller and requires `email_confirmed_at` to be set. Never pass an email in. An
unconfirmed address proves nothing, and claiming on one would let anyone sign up as a
stranger's address and take their contracts and personal details.

---

## 1. `/portal/register`

Fields: full name, email, password, confirm password.

- Use `supabase.auth.signUp` with the request-scoped browser client, `emailRedirectTo`
  pointing at the existing `/portal/auth/confirm` route.
- Password rules stated **before** submit, not after failure. Minimum 8 characters.
- **Pre-fill the email from `?email=` in the URL** and explain why: *"Use the same email
  address you applied with so we can connect your application."* Then add that parameter
  to the register link in the quote and approval emails.
- If the email already has an account, do not reveal that as an error — say *"If that
  address already has an account, sign in or reset your password"* with both links.
  Confirming which addresses exist is an information leak.

After signup, show a "check your email" state naming the address, with a resend button
(rate-limited by Supabase already — surface its error plainly rather than silently
failing).

## 2. Call `claim_my_records()` at the right moments

Call it, and ignore the result unless something was claimed:

- immediately after email confirmation completes in `/portal/auth/confirm`;
- on every successful portal sign-in — cheap, idempotent, and catches records raised
  after the account was made.

When it returns anything above zero, show it on the dashboard once:

> *We found your application and quote DD-1133 and added them to your portal.*

That single sentence turns a bewildering empty portal into an obvious success.

## 3. Link registration from everywhere it is needed

- `/portal/login` — a clear **Create an account** link. This is the one that is missing.
- The quote email's register-first variant and the approval email already point at
  `/portal/login`; change both to `/portal/register?email=...` in
  `src/lib/notifications/applicantEmails.ts`.
- The apply success page's "create your portal account" call to action.

## 4. Push visitors to APPLY, not to enquire

Places are allocated by application, not by order of enquiry. Every enquiry that could
have been an application is a conversation Matt has to have by hand, and a buyer whose
details he does not have.

**Already correct — do not undo:**

- `/(site)/litters/[id]` gets this right. It leads with *"Start Application"*, explains
  that places are *"allocated by application, not by order of enquiry"*, and offers
  *"Ask A Question First"* as the quieter secondary. Use this page as the model.
- `/(site)/dogs/[slug]` has *"Apply for This Dog"* linking to `/apply?dog_id=…`.

**Fix these:**

1. **Dog detail — apply and enquire currently read as equals.** The `GoldLink` and the
   `EnquiryModal` are stacked with the same weight. Make Apply primary and the enquiry a
   quiet text link beneath it, matching the litter page.

2. **Dog detail — an unavailable dog is a dead end.** `Apply for This Dog` only renders
   when `status === "available"`; everything else offers an enquiry alone. That is the
   moment a keen buyer is most persuadable. Instead show:
   - *reserved* or *sold* → **"Apply for a future litter"** → `/apply`, with one line:
     *"This one is taken. Tell us what you are looking for and we will match you to a
     coming litter."*
   - never a bare enquiry as the only route.

3. **Dogs list page — no call to action at all.** Add a block beneath the grid: apply, or
   join the waiting list. Its empty state currently says *"check back soon or make an
   enquiry"* — change to inviting an application, since that is what actually reserves a
   place.

4. **Litters list page — same.** Its empty state says *"Make an enquiry to register your
   interest"*. Change to an application. A litter that does not exist yet is exactly what
   the waiting list is for.

**Do not remove the enquiry route.** Some buyers genuinely need a question answered before
committing twenty minutes to a form, and a wall with one door loses them. Keep it — as
the secondary, everywhere.

Carry `dog_id` / `litter_id` through to `/apply` wherever the context is known, so the
application arrives already attached to the dog or litter that prompted it.

## 5. Profile completeness

A registered buyer should be able to fix their own details without emailing Matt. The
profile screen exists — make sure name, phone and address are editable and save cleanly,
and prompt once on the dashboard if phone or address is blank: *"Add your delivery
details so we can plan your puppy's handover."*

## 6. Check the app, change only if broken

`diedericks-dobermanns` already has sign-up, OTP verification and `verify-code.tsx`
accepting 6–8 digit codes — that was fixed and is not in scope. **Do** add the
`claim_my_records()` call to the app's post-verification and sign-in paths so a buyer who
registers on the phone gets the same linking. Nothing else in the app.

---

## Rules

- Portal routes use the request-scoped client so RLS applies. Never `createAdminClient()`.
- Never reveal whether an email address already has an account.
- Never call `claim_my_records()` with a user-supplied email — it takes no arguments by design.
- Never throw in a portal page; return an empty state and log.
- No file over 300 lines.
- Loading, empty and error states on every form. Every error tells the user what to do next.

## Verify

- [ ] A new visitor can register from `/portal/login` without knowing a hidden URL.
- [ ] Registering with the email from an existing application links it — the application, quote and waiting-list entry appear in the portal.
- [ ] The "we found your records" message appears once, and not again on the next visit.
- [ ] Registering with an email that already has an account does not reveal that it exists.
- [ ] An unconfirmed account claims nothing.
- [ ] Signing in later still links records raised after registration.
- [ ] A second client cannot see the first client's claimed records.
- [ ] `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types. A client/server import mistake broke every deployment for six hours this week and `tsc` did not catch it.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, `git push origin main`.
If you touch the app, commit that separately — its repo root is the **parent** folder.

Regenerate types in both repos first, using `Set-Content -Encoding utf8`, never `>`:
PowerShell redirection writes UTF-16 and silently corrupts the file.

No migration needed — `claim_my_records()` is live.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`, or
`src/components/layout/WhatsAppButton.tsx`.
