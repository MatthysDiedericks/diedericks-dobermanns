# CURSOR PROMPT — Invite a buyer to the portal with a one-click link, no password

Matt sells to people who are not comfortable online. Some are elderly. Self-registration asks them
to invent a password of **12 characters with upper, lower, a digit and a symbol**, type it twice on
a phone, then find a confirmation email. Several have already failed at it.

**Build an admin "Invite to portal" that signs them in from a link. No password, ever.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — what exists

- **No invite, magic-link or `signInWithOtp` code exists on the website.** Nothing to extend; this is new.
- **The app already has OTP**: `app/(public)/verify-code.tsx` and `lib/auth.ts`. Reuse that pattern rather than inventing a second one.
- `claim_my_records()` runs on sign-in and links a contact, quote, invoice and reservation by **email**. It works — Jocelyn Makenzie's records attached this way.
- Supabase password policy is **12 chars + lower + upper + digit + symbol**, mirrored in `src/lib/auth/passwordPolicy.ts`. This is the wall buyers keep hitting.
- Current waiting list: **14 entries, 10 with no portal account.**

---

## 0 · Both routes stay. This is an addition, not a replacement

**Do not remove, hide, or discourage self-registration.** `/portal/register` stays exactly as it is,
linked from the site as it is now, with the password checklist that was fixed on 17 August.

Most buyers register themselves without help and should keep doing so. The invite exists for the
ones who cannot — and Matt decides which is which, case by case.

The two routes must **converge on the same account**:

- A buyer who was invited, then later registers with the same email, must land in the **same account** — not a duplicate.
- A buyer who registered themselves can still be sent an invite link later if they get locked out.
- Either way, `claim_my_records()` links the same contact, quote and invoice.

**Test both directions** — invite-then-register, and register-then-invite. A duplicate account with
half the buyer's history in each is the failure mode here, and it is not obvious until someone
cannot find their contract.

## 1 · The rule: never send a password

**Do not generate a password. Do not email a password. Do not display a password for Matt to read
out.** Not as a fallback, not "temporarily", not even one the user must change on first login.

A password that satisfies the policy is exactly the string these buyers cannot type. And a password
in an inbox stays there for years, next to the contract and ID document that account will hold.

**Send a link that signs them in.** That is the whole design.

## 2 · The admin action

**"Invite to portal"**, available on:

- an **approved application**
- a **waiting-list entry**
- a **client record**

It must work when the buyer has **no account yet** and when they have one but have never signed in.

On click:

1. Create or find the auth user for that email
2. Generate a **sign-in link**
3. Email it
4. **Show Matt the link with a copy button, and a WhatsApp send button**

### The WhatsApp copy is not optional

Matt reaches these clients on WhatsApp. It is where they actually look, and half of them will not
find an email at all. **A copyable link and a `wa.me` button matter more than the email does** —
build both, and do not treat WhatsApp as the fallback.

Pre-fill the WhatsApp message in Matt's voice, something like:

> Hi Nicolas, here is your private link to your Diedericks Dobermanns account — tap it and you are
> in, no password needed. You will be able to see your puppy's photos, weights and paperwork.

**Never auto-send anything.** Standing rule: Matt sends messages to clients, the system does not.
The email goes when he clicks; the WhatsApp opens in his own WhatsApp for him to press send.

## 3 · Link behaviour — this is where it must be forgiving

These are the users least able to recover from a failure.

- **Long expiry.** Supabase magic links default to one hour; that is far too short for someone who checks messages in the evening. Configure the longest the project allows and **state in your reply what the actual expiry ended up being.**
- **An expired link must not be a dead end.** It lands on a page saying *"This link has expired — ask Matt for a new one"*, with a WhatsApp button to him. **Never show an auth error code to a buyer.**
- **Resend link** on the same admin screens, any number of times. No cooldown that blocks Matt.
- Signing in from the link must work **on a phone browser** — that is where it will be opened.

## 4 · After they land

- Straight into the portal. **No forced password setup, no profile wizard, no tour.**
- `claim_my_records()` runs, so their contact, quote, invoice and statement attach immediately.
- A quiet, dismissible line in the profile: *"Set a password if you would like to sign in without a link."* **Optional forever.** The link route must keep working for someone who never sets one.

## 5 · Track it, so Matt knows where each buyer is

On the waiting-list row and the client record, show one of:

```
No account · Invited 20 Aug (not opened) · Signed in 21 Aug
```

**"Invited but never opened" is the state that matters** — it is the buyer who is quietly stuck and
will otherwise be assumed to be ignoring you. Surface it on the admin dashboard next to the
awaiting-review count.

## 6 · Security — do not weaken anything

- The invite action is **admin only**, `requireAdmin()`, and writes to `audit_log`: who invited whom, when.
- The link signs in **that email only**. It must not be reusable for a different account.
- Rate-limit invites per recipient so the action cannot be used to mail-bomb someone. Reuse `check_rate_limit`. **Generous** — Matt resending three times in five minutes is normal behaviour, not abuse.
- Log failures to `error_events` with an `INVITE_` prefix: `INVITE_SEND_FAILED`, `INVITE_EXPIRED_USED`, `INVITE_UNHANDLED`.

---

## The app

Matt invites people while standing at the kennel with the buyer in front of him.

- Same **Invite to portal** on the app's application, waiting-list and client screens.
- **Share sheet** rather than a copy button — it opens WhatsApp directly on a phone.
- Same invite-state chip on the row.
- Reuse the existing OTP/auth code in `lib/auth.ts`; do not add a second auth path.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- **No password is ever generated, sent, or displayed.**
- Nothing is auto-sent to a client. Matt presses send.
- An expired link always offers a way forward, never an error code.
- Password setup is optional, permanently.
- Admin-only, audit-logged, rate-limited generously.
- Reuse `claim_my_records()` and the app's existing auth path.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

**Matt will test this himself before any real buyer sees it. Make that possible: the first
verification below must be reproducible by him on his own phone.**

- [ ] Invite a test address you control. Paste the email received and the link.
- [ ] Opening the link **on a phone browser** signs in with no password and lands in the portal.
- [ ] `claim_my_records()` attached the contact — show the row before and after.
- [ ] The WhatsApp button opens WhatsApp with the message and link pre-filled. Paste the `wa.me` URL.
- [ ] **Nothing sends until Matt clicks.** Prove no email leaves on page load.
- [ ] State the actual link expiry you configured.
- [ ] An expired link shows the friendly page with a WhatsApp button, **not** an auth error.
- [ ] A used link cannot be reused to sign in again.
- [ ] A link issued for one email cannot sign in as another account. **Test it and paste the result.**
- [ ] Resending three times in five minutes succeeds.
- [ ] Inviting **Nicolas Hohls** (waiting list, `deposit_paid`, no account) works — he is the real first case.
- [ ] The row then shows "Invited 20 Aug (not opened)", and changes to "Signed in" after the link is used.
- [ ] Each invite writes an `audit_log` row naming the admin and the recipient.
- [ ] A non-admin cannot call the invite action. Test with a client account.
- [ ] Setting a password afterwards is optional, and the link still works for a user who never sets one.
- [ ] **Self-registration at `/portal/register` still works exactly as before.** Register a fresh test account with a password and confirm it succeeds — the password checklist, the 12-character rule, all unchanged.
- [ ] **Invite → then register with the same email = ONE account**, not two. Paste both `auth.users` and `contacts` counts for that email.
- [ ] **Register → then invite the same email = the SAME account**, and the link signs into it.
- [ ] After either route, `claim_my_records()` has attached the same contact, quote and invoice. Show the rows.
- [ ] App: invite from the app, share sheet opens WhatsApp. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id. **Three deployments failed today; committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the invite action, link handling and expiry page, invite
state tracking, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
