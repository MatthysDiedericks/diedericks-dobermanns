# CURSOR PROMPT — Brand the auth emails, welcome the client, stop duplicate contacts

A new client, **Felicia Nell**, registered at 12:09 today. Everything technical worked: she
confirmed, signed in, and her quote **DD-1138 (R20 000)** is linked to her account with her
waiting-list entry advanced to `quote_sent`.

What she received was this:

> **Confirm your email address**
> Follow the link below to confirm this email address and finish signing up.
> Confirm email address
> Or enter this code in the app: **65647085**

No branding. No welcome. No explanation of what the code is for or where to type it. No idea what
happens next. This is the **Supabase default template** — it never passes through `emailShell`, so
none of the branding or the support footer we added applies to it.

This is the first thing a buyer sees after paying attention to a R20 000 purchase, and it looks
like a system notification from nobody.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`.

---

## 1. Understand where these emails come from before changing anything

**Auth emails are not sent by our code.** Confirm signup, password reset, magic link and email
change are sent by Supabase Auth from templates held in
**Dashboard → Authentication → Email Templates**. `emailShell` never touches them, which is why the
footer work did not reach this email.

Two ways forward. **Do the first now, propose the second.**

### 1a. Rewrite the templates (Matt pastes them in — do this now)

Produce ready-to-paste HTML for **Confirm signup**, **Reset password** and **Magic link**, matching
`emailShell`: `#111008` background, `#1C1A0E` panel, `#C4A35A` gold heading, `#F5F0E8` text, Georgia
serif. **Inline styles only** — email clients strip `<style>` blocks.

Put them in `docs/auth-email-templates/` as three `.html` files with a short README saying exactly
where in the dashboard each one goes. Matt cannot deploy these from Cursor; he must paste them, so
make that painless.

Supabase variables available: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`,
`{{ .SiteURL }}`.

### 1b. Propose the auth hook (do not build it yet)

Supabase supports a **Send Email Hook** that routes auth mail through our own function — which
would put every email through `emailShell` and end the split permanently. **Write a short note on
what it involves and what it would cost, and stop.** Matt decides. Do not wire it in this pass.

## 2. What the confirmation email must say

Structure, in this order:

1. **A welcome, by name.** *"Welcome, Felicia."* Not "Dear Customer". We have the name on the application.
2. **One sentence on what this email is for** — confirming the address so her portal can be opened.
3. **The button** — *Confirm my email address*. Gold, unmissable.
4. **The code, explained.** Currently it reads as a mystery number. It must say: *"Signing up on the phone app instead? Enter this code there: 65647085"*. A code with no destination is worse than no code.
5. **What happens next**, concretely — because this is the question she actually has:
   > *Once confirmed, sign in and you will find your application, your quote and your documents waiting for you.*
6. **The support footer** — the email and WhatsApp from `app_settings`, same as every other client email.

Keep it short. **No marketing, no puppy photos, no links to the shop.** She is mid-task; the job of
this email is to finish the task.

Reset-password and magic-link follow the same shape with the wording changed.

## 3. Welcome her properly once she is in

There is no welcome anywhere. First sign-in should show a short panel on the portal dashboard:

> **Welcome, Felicia.** Your quote DD-1138 is ready to view, and your application is on file.
> Here is what happens next: accept your quote, pay the deposit, and we will send your agreement.

Dismissible, shown once, and it names **what is actually in her portal** — not a generic greeting.
If she has a quote, say so. If she has none, say what she is waiting for.

Also send a **welcome email on first confirmed sign-in** — through `emailShell`, so it carries the
branding and footer. One email, warm, naming her quote and her next step. **Not automatic
marketing**: it is a transactional welcome tied to her own records, and nothing about it repeats.

## 4. Stop creating a duplicate contact for every new client

Felicia now has **two contact records**: `Felicia Nell [enquiry]` from her application, and
`Felicia [app_signup]` from her registration. Same person, same email, same day.

This happens to **every** client who applies and then registers. It is the same duplication we
spent this morning cleaning up, being recreated by the signup path.

**On signup, look for an existing active contact by email first** — `contacts_active`, excluding
merged rows. If one exists, attach `user_id` to it and update any blank fields from the signup.
**Create a new contact only when none matches.**

Merge Felicia's two records as part of this, keeping the fuller name **"Felicia Nell"**.

## 5. She reported not being able to reach her portal

She is confirmed and signed in, and DD-1138 is correctly linked — so the data is right. Check what
she would actually have **seen**: the portal dashboard on first sign-in, with a quote and an
application and no dog yet. Make sure that state renders something useful rather than an empty
screen, which is the most likely reason someone says "I can't log in".

An empty portal with no explanation is indistinguishable from a broken one.

---

## Rules

- Auth template HTML is inline-styled and delivered as files for Matt to paste; do not claim they are live.
- Do not build the auth hook in this pass — propose it.
- The welcome email is transactional, sent once, and carries the support footer.
- Never create a second contact for an email that already has an active one.
- No marketing content in any auth email.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Three template files exist with a README naming the exact dashboard location for each.
- [ ] The confirm template renders correctly in Gmail on Android and in Apple Mail — **inline styles only, no `<style>` block**.
- [ ] It greets by name, explains the code and where to enter it, and states what happens after confirming.
- [ ] It carries the support email and WhatsApp from `app_settings`.
- [ ] Registering a **new** test address creates exactly **one** contact, not two.
- [ ] Registering with an address that already has a contact attaches to it and creates none.
- [ ] Felicia's two contacts are merged, keeping "Felicia Nell", and her quote and application still resolve.
- [ ] First sign-in shows the welcome panel naming her actual quote, and it does not return on the next visit.
- [ ] The welcome email sends once and never again.
- [ ] A portal with a quote but no dog shows something meaningful, not a blank page.
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
- [ ] Any migration is **applied and confirmed against the live database** before reporting done.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
