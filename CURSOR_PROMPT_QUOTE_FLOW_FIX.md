# CURSOR PROMPT — Make quoting work end to end after approval

The application → approve → quote path is fully built and it does not work in practice. Matt
approves an applicant, presses **Create Quote**, and gets a form he has to fill in entirely by
hand. Proof from the live database: **0 of 4 quote line items are linked to a real dog**, and
every quote was written with a typed description, a typed price and a typed client name.

Three specific causes, all fixable.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Cause 1 — the client picker only offers registered users

`/admin/quotes/new` builds its client list from `users where role = 'client'` — currently five
people. **An applicant has almost never registered at the moment they are quoted.** So Matt cannot
select them, falls back to typing a name into `historical_client_name`, and the quote is born with
`client_id = null` — never reaching a portal.

`historical_client_name` exists for pre-system records. It must stop being the default for live
buyers.

**The picker must offer, in one searchable list:**

1. **The applicant from this application** — pre-selected when `?applicationId=` is present. This is the answer in almost every case and should need no clicking.
2. Registered portal users.
3. Existing contacts (excluding merged ones — use `contactsActive`).
4. A clearly separated "not in the list" option that still allows a typed name.

On save, resolve the buyer once:

- Applicant email has a **confirmed** `auth.users` row → set `quotes.client_id` to it.
- No account → find or create a `contacts` row from the application (name, email, phone, country) and store its id on the quote so the buyer is a real record, not a string. When they register, `claim_my_records()` attaches the quote to their account.

**Never match on an unconfirmed address**, and never on a name. An unconfirmed address proves
nothing, and linking on one hands a stranger somebody's quote and personal details.

## Cause 2 — no available puppy has a price

All eight available puppies have `programme_tier = NULL` and `price = NULL`, while the tiers
themselves are priced (`puppy` R20 000, `elite_developed` R60 000, `protection_dog` on request).
So choosing a dog fills in nothing and Matt types the amount from memory.

**Add a tier at litter level so puppies inherit it.**

```sql
alter table public.litters
  add column if not exists default_programme_tier text
    check (default_programme_tier is null or default_programme_tier in
      ('puppy','elite_developed','protection_dog'));
```

Then resolve a dog's price in this order, and **say on screen which step was used**:

1. `dogs.price` — explicitly set for this puppy
2. tier price for `dogs.programme_tier`
3. tier price for `litters.default_programme_tier` — *"R20 000 (Standard Puppy, from litter default)"*
4. tier price for the application's `dog_interest`, when no dog is chosen yet
5. nothing — blank field, labelled *"Set a price"*

**Never silently show a price without saying where it came from.** A number Matt cannot account for
is a number he will not trust, and this is what goes to a client.

**Bulk action on the litter page:** *"Set tier for all puppies in this litter"* — pick a tier, apply
to every puppy that has none, report how many were changed. Doing eight dogs one at a time is why
this never got done. Do **not** overwrite a puppy that already has its own tier or price.

## Cause 3 — nothing prefills from what they asked for

Applications already carry `dog_interest` (`puppy` / `elite_developed`), `preferred_sex`,
`preferred_colour`, `tail_preference`, and sometimes `litter_interest_id`.

`buildQuotePrefillFromApplication` exists — make it produce a **ready-to-send draft**, not an empty
form:

- One line item at the tier they asked for, priced by the rules above.
- Description built from their stated preferences, exactly as the existing quotes read: *"Standard Puppy (Male, Black & Tan, Docked)"*. Where a preference is missing, leave it out rather than guessing.
- If `litter_interest_id` is set, offer that litter's available puppies first in the dog picker.
- Everything editable. The prefill is a starting point, never a lock.

**The target: approve → Create Quote → check it → Send.** No typing in the common case.

---

## The quote must go by email *and* into the portal

`sendQuoteToRecipient` already builds the PDF via `quotePdfBase64` and attaches it, and already
stamps `sent_at`. That part works. What is missing is that it only works when a recipient resolves —
which Cause 1 prevents.

On **Send**, all four must happen or none:

1. Email to the buyer **with the PDF attached**.
2. The quote visible in their portal, openable as the same PDF.
3. `sent_at` stamped and the status moved to `sent`.
4. The waiting-list entry advanced to `quote_sent`.

If the email fails, **do not mark the quote sent** — the current code already gets this right
(*"Status advances only after mail succeeds"*). Keep it. A quote marked sent that never arrived is
worse than an obvious failure.

**When the buyer has no portal account**, the email says so plainly and links to
`/portal/register?email=…` pre-filled: *"Create your portal account with this same address and your
quote, application and documents will be waiting for you."*

**Creating a quote still sends nothing.** Matt creates, reviews, presses Send. No automatic sending
anywhere.

---

## App — `diedericks-dobermanns`

Matt quotes from his phone. The app's quote builder needs the same client picker (applicant first),
the same price resolution with its source shown, and the same send behaviour. The client portal in
the app lists quotes with the PDF openable.

---

## Rules

- `historical_client_name` is for genuinely historical records only; a live applicant gets a real link.
- Link only on an exact lowercased email match to a **confirmed** account; otherwise use a contact.
- Every prefilled price states its source on screen.
- Never overwrite a dog's own tier or price with a bulk action.
- Creating sends nothing; sending sends exactly one email.
- Merged contacts never appear in any picker.
- No file over 300 lines. `requireAdmin()` on every admin action.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Approving **Dwayne Lombard** (approved 14 Aug, no quote) then pressing Create Quote produces a draft with his name selected and a priced line, with nothing typed by hand.
- [ ] The client picker finds an applicant who has never registered.
- [ ] Saving that quote sets `client_id` or a contact id — **verify by SQL**, not on screen. It must not land in `historical_client_name`.
- [ ] Setting a litter's default tier prices all its puppies in the builder, and the screen says the price came from the litter default.
- [ ] The bulk tier action skips puppies that already have their own tier or price, and reports the count changed.
- [ ] A dog with its own `price` beats the tier price.
- [ ] Sending emails the PDF **and** shows the quote in the buyer's portal.
- [ ] A buyer with no account gets the register link with their email pre-filled, and the quote attaches when they confirm.
- [ ] If the email fails, the quote is **not** marked sent.
- [ ] `sent_at` is stamped on every send, first and resend.
- [ ] The waiting-list entry moves to `quote_sent`.
- [ ] The app produces the same draft from the same application.
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

Migration number: check the folder and take the next free one — there is existing inconsistency, so
do not assume. Two repos, separate commits. **Website:** from `diedericksdobermann-web/`.
**App:** repo root is the **parent** folder. Push both, then `git log origin/main -1` in each and
confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
