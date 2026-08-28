# CURSOR PROMPT — Signing up must never split a client in two, and a link must survive a mail scanner

Josef Kotse bought Puppy 1 (Pink). He was invited to the portal on **26 Aug 2026 at 06:21:48**. His
email was confirmed **35 seconds later at 06:22:23**. He has **never signed in** — `last_sign_in_at`
is still null. He messaged Matt saying his link had expired.

Three faults did that, and the second one is worse than the first.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Fault 1 — the sign-up trigger creates a duplicate contact every time

`public.sync_user_to_contacts()`, fired by `trg_sync_user_to_contacts` on `public.users`:

```sql
INSERT INTO contacts (full_name, email, ..., user_id, ...)
VALUES (...)
ON CONFLICT (user_id) DO UPDATE SET ...
```

**It only conflicts on `user_id`.** A brand-new user has a brand-new id, so the conflict never fires
and a fresh contact row is always inserted — **even when a contact with that exact email already
exists**. Email is never consulted.

Josef therefore became two people: `Josef Kotse` (11 Aug, holds his quote and his puppy) and
`Josef Kotze` (26 Aug, holds nothing). His login was wired to the empty one. Had the link worked,
he would have signed into a completely blank portal — no puppy, no quote, no paperwork.

**This has already happened to five email addresses**, three of them real clients:

```
josef@topproducts.co.za    Josef Kotse (11 Aug)      | Josef Kotze (26 Aug)
jannecke.bester@gmail.com  Jannecke Smit (11 Aug)    | Jannecke  Smit (18 Aug)
felicianell6@gmail.com     Felicia Nell (17 Aug)     | Felicia (17 Aug)
felicia03@rocketmail.com   Felicia (23 Jun)          | Lovey (11 Aug)          [merged]
matt@bastionsecurity.org   Matt x2 + Matthys         [merged]
```

Josef's pair has already been merged by hand and his puppy allocated. **Jannecke Smit and Felicia
Nell have not been** — Jannecke is a Claire × Santini buyer collecting in under two weeks.

### Fix it in the trigger

Match an existing contact on **normalised email** — `lower(btrim(email))` — before inserting.

- If a contact with that email exists and has **no** `user_id`, attach the new `user_id` to it and update the blank fields. **Never overwrite a non-null value with a null** — the imported record usually has the better name, phone and history.
- If it exists and already has a **different** `user_id`, do **not** steal it and do **not** create a second row. Insert nothing, and record it for a human. Two logins on one email is a real situation that needs eyes, not a guess.
- Only insert when no contact holds that email.
- Keep the existing `ON CONFLICT (user_id)` branch — it still protects re-runs.

Add a **partial unique index on `lower(btrim(email))`** where `email` is not null and
`merged_into_contact_id is null`, so this cannot silently recur. Expect it to fail on first run:
clean the two unmerged pairs first, in the same migration.

`contacts` already has `merged_into_contact_id`, `merged_at` and `merged_by` — use them. Merging
means repointing quotes, invoices, waiting-list rows, dogs (`owner_contact_id`), applications and
documents to the survivor, then stamping the loser. **Do not delete a contact.**

## Fault 2 — a single-use magic link dies to a corporate mail scanner

`src/lib/admin/portalInvite.ts` line 123 issues `generateLink({ type: "magiclink" })` and emails it.
Magic links are **consumed on first fetch**.

`topproducts.co.za` is a business domain. Business mail gateways fetch every link in an inbound
message to check it is safe. That fetch confirmed Josef's email at 06:22:23 and burned the token.
By the time he tapped it, it was spent — and the page correctly told him it had expired.

The expiry page itself worked exactly as designed: it offered a WhatsApp button to Matt, pre-filled,
and that is what Josef used. **Do not change the expiry page.** The bug is upstream.

### What to change

- **Lead with WhatsApp, not email.** `CURSOR_PROMPT_PORTAL_INVITE_LINK.md` already said a copyable link and a `wa.me` button matter more than the email — because a WhatsApp link is opened by a person, never by a scanner. Make WhatsApp the primary action in the admin invite panel and the email the secondary one.
- **Prefer a 6-digit code over a link where you can.** The app already has OTP in `app/(public)/verify-code.tsx` and `lib/auth.ts`. A code cannot be consumed by a scanner. Reuse that path; do not build a third.
- **State the real expiry** in the admin UI and in the message. Not "expires soon".
- **Re-issuing must always work**, with no cooldown that blocks Matt, and must invalidate nothing the client is mid-way through.
- Log the distinction to `error_events`: a link **used by a scanner** (confirmed, never signed in) is not the same failure as a link that **timed out**. Right now both look identical, which is why this took a client complaint to find.

### Surface the stuck state

`InviteStateChip.tsx` and `InviteStuckCard.tsx` already exist. Add the state that actually caught
Josef: **email confirmed, never signed in.** That is a client sitting locked out, and it is
detectable the moment it happens — `email_confirmed_at is not null and last_sign_in_at is null`.

Show it on the client record and count it on the admin dashboard.

## Fault 3 — a quote stays unlinked until the buyer's first sign-in

`src/lib/finance/quoteBuyerDisplay.ts` line 56:

```ts
const hasPortalAccount = Boolean(quote.client_id);
```

So the **NO PORTAL ACCOUNT** marker on the quotes list is driven by `quotes.client_id` — a different
link from the `contacts.user_id` one that Fault 1 broke.

`quotes.client_id` is only ever set by `claim_my_records()`, and **that function only runs when the
client signs in.** Josef's quote DD-1146 was created 26 Aug with `contact_id` set and `client_id`
null. He has a portal account. The list still said he had none, because he had never signed in — and
if he never does, it stays that way forever.

`claim_my_records()` itself is correct: it matches quotes to a login through the contact's email, and
would have healed this on first sign-in. The bug is that nothing links the quote **at creation**,
when the answer is already known.

### Fix

- **When a quote is created or its contact is changed, set `client_id` immediately** if that contact's email already has a portal account. Do not wait for sign-in.
- Do the same for **invoices**, which copy `client_id` from the quote in `convert_quote_to_invoice` and inherit the same null.
- Backfill every existing quote and invoice whose contact email matches a portal account.
- Leave `claim_my_records()` in place — it is still the right net for buyers who register later, and it is correctly written. **Do not duplicate its logic; extract the shared matching so there is one rule.**
- The marker must then mean what it says: *no portal account exists*, not *has not signed in yet*. Those are different problems for Matt and need different words.

---

## The app

- Same trigger fix — it is server-side, nothing to duplicate. **Do not reimplement the matching in TypeScript.**
- Same invite-state chip, including the new stuck state.
- Share sheet first, email second, matching the website.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Match contacts on normalised email. Never create a second contact for an email already held.
- Never overwrite a populated field with a null.
- Never delete a contact — merge and stamp.
- Two logins on one email is escalated to a human, never guessed.
- No password is generated, sent or displayed. Standing rule.
- Nothing auto-sends to a client. Matt presses send.
- Do not change the expiry page — it behaved correctly.
- Link a quote to a portal account at creation, not at sign-in. One shared matching rule, not two copies.
- Josef Kotse's records were repaired by hand on 26 Aug — leave them exactly as they are.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Migration applied. Paste the new `sync_user_to_contacts()` body.
- [ ] Create a test auth user with an email that **already** has a contact. **One** contact row exists afterwards, carrying the original name and phone. Paste before and after, then remove the test user.
- [ ] Create a test auth user with a genuinely new email. A contact is created normally.
- [ ] A second login on an email already bound to a different user creates **nothing** and raises the record for review. Show it.
- [ ] The unique index on `lower(btrim(email))` exists and the table is clean. Paste `select lower(btrim(email)), count(*) from contacts where email is not null and merged_into_contact_id is null group by 1 having count(*) > 1` — expect **zero rows**.
- [ ] **Jannecke Smit and Felicia Nell are merged**, quotes/invoices/dogs/waiting-list all repointed to the survivor. Paste both pairs before and after.
- [ ] Josef's records are untouched by your merge — he was fixed by hand on 26 Aug. `Josef Kotse` holds the login, 1 quote and Puppy 1 (Pink). Confirm.
- [ ] The admin invite panel leads with WhatsApp. Screenshot. Paste the `wa.me` URL.
- [ ] State the actual link expiry you configured.
- [ ] Re-issuing an invite three times in five minutes succeeds.
- [ ] A client with `email_confirmed_at` set and `last_sign_in_at` null shows the stuck chip and is counted on the dashboard. **Josef was exactly this — verify against his record before you re-invite him.**

**Fault 3**

- [ ] Creating a quote for a contact whose email already has a portal account sets `client_id` **at creation**. Paste the row.
- [ ] Converting that quote to an invoice carries `client_id` through. Paste the invoice row.
- [ ] Backfill done: `select count(*) from quotes q join contacts c on c.id=q.contact_id join auth.users u on lower(u.email)=lower(trim(c.email)) where q.client_id is null` returns **0**. Same query for `invoices`.
- [ ] **Josef's DD-1146 is already linked — it was fixed by hand on 26 Aug. Your backfill must leave it unchanged.** Confirm `client_id = da1b8f94-9a0c-4e4a-a0ac-c4ad85f85520`.
- [ ] The quotes list no longer marks a buyer who has an account. Screenshot before and after.
- [ ] A buyer with genuinely no account still shows the marker, with wording that distinguishes it from "has an account, has not signed in".
- [ ] `claim_my_records()` still works for a buyer who registers later — run it for a fresh test user and paste the returned counts.
- [ ] Simulate a scanner: fetch the invite link once with `curl`, then open it in a browser. The client is not dead-ended, and `error_events` distinguishes it from a timeout.
- [ ] App: same chip, share sheet first. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the trigger and unique index, the duplicate cleanup, the
WhatsApp-first invite, the stuck-invite state, linking quotes at creation, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
