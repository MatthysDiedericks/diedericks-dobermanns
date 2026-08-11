# CURSOR PROMPT — Finish the quote system

The quote system is ~90% built. This closes the remaining gaps so a real quote can go out
to a real client. **Read the state below before writing anything** — most of the
infrastructure already exists and must be reused, not rebuilt.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Already done — do not redo

- Migrations **0053** and **0054** are **applied to the live database**. `accept_quote()`,
  `decline_quote()` and `client_owns_quote()` exist as SECURITY DEFINER RPCs. There is **no**
  client UPDATE policy on `quotes` — acceptance goes through the RPC only. Do not add one back.
- Letterhead components, print stylesheet, PDF builder, portal quote pages, proof-of-payment
  upload, and the admin review flow are all built.
- **Company and banking settings are populated in `app_settings`** and already match the keys
  in `SETTINGS_KEYS`:

  | Key | Value |
  |---|---|
  | `company_name` | Diedericks Dobermanns |
  | `contact_address` | 302 Usutu Drive / H115 Mhlambanyatsi / Eswatini |
  | `contact_phone` | +27782150832 |
  | `company_phone_secondary` | +268 7802 0580 |
  | `contact_email` | diedericksdobermannssa@gmail.com |
  | `quote_email` | diedericksdobermanns@gmail.com |
  | `bank_name` / `bank_account_name` / `bank_account_number` / `bank_branch_code` | Standard Bank / MR M DIEDERICKS / 27 311 907 9 / 2749 |
  | `quote_terms` | R10,000 non-refundable deposit. Balance payable in cash on delivery. |
  | `vat_number` | **blank — the kennel is NOT VAT registered** |
  | `bank_swift` | **SBZAZAJJ** (Standard Bank of South Africa, Johannesburg) |
  | `bank_country` / `bank_address` | South Africa / Standard Bank Centre, 25 Sauer Street, Johannesburg |
  | `legal_entity_name` | **Matthys Diedericks t/a Diedericks Dobermanns** |
  | `entity_type` | `sole_proprietor` |
  | `company_registration_number` | **blank and correct — not a registered company** |
  | `bank_account_note` | "Diedericks Dobermanns is a sole proprietorship — payments are made to the owner's personal account, Matthys Diedericks." |

- **Pricing tiers are set:**

  | Tier | Price |
  |---|---|
  | Standard Puppy (`puppy`) | R20,000 |
  | Elite Developed Puppy (`elite_developed`) | R60,000 |
  | Fully Trained Protection Dog (`protection_dog`) | **price on request** |

---

## 1. `price_on_request` — new column, no UI yet

`pricing_tiers.price_on_request boolean not null default false` was added live. It exists so
two states stay distinct:

- `price_on_request = false, price = 0` → **nobody has set it** → block sending.
- `price_on_request = true` → **deliberately quoted per client** → prompt for an amount.

Build:

- **Pricing settings screen**: a "Price on request" toggle per tier. When on, the price input
  is disabled and shows "Quoted per client".
- **Quote builder**: adding a dog whose tier is `price_on_request` (currently only
  Fully Trained Protection Dog) must leave the line amount
  **blank and focused**, with helper text *"This tier is quoted per client — enter the agreed
  amount."* Do **not** prefill 0 and do not block on it being a "R0 tier".
- **Public site**: where tier prices are shown, render "Price on request" rather than "R0".
- The existing R0 send-block must only fire for `price_on_request = false` tiers, and for any
  quote whose **total** is 0. A quote with a manually entered amount on a price-on-request
  tier must send normally.

## 2. Company Profile + Banking admin screen

I populated `app_settings` directly via SQL. Matt cannot currently edit any of it.

Build `/admin/settings` sections **Company Profile** and **Banking Details** covering every key
in the table above. Every field now has a value; nothing is outstanding.

**The kennel is a sole proprietorship, not a registered company.** This matters for how the
letterhead reads:

- `company_name` ("Diedericks Dobermanns") is the **trading name** — use it for the masthead
  and anywhere the brand is displayed.
- `legal_entity_name` ("Matthys Diedericks t/a Diedericks Dobermanns") is the **contracting
  party** — print this in the "From" block on quotes and invoices, because that is who the
  client is actually contracting with.
- When `entity_type = 'sole_proprietor'`, **hide the registration number field entirely** on
  the letterhead and label it in settings as *"Only if registered as a company — leave blank
  for a sole proprietorship."* Printing an empty "Reg No:" label looks like an error.

- Multi-line textarea for `contact_address`.
- Explain `vat_number`: *"Leave blank if you are not VAT registered. When blank, no VAT line
  is printed on quotes or invoices."* **Never** print a VAT line or say "incl. VAT" when blank —
  that is a legal misstatement, not a formatting choice.
- Show a warning banner when any banking field is empty: *"Clients will not know how to pay."*

## 3. Two email addresses — reconcile

`contact_email` is `diedericksdobermannssa@gmail.com`; `quote_email` is
`diedericksdobermanns@gmail.com` (no "sa"). The second comes from the kennel's existing
quote stationery.

Use `quote_email` on the letterhead if set, otherwise fall back to `contact_email`. Surface
both in the settings screen with a note that they differ, so Matt can decide. Do not silently
pick one.

## 4. Quote numbering

The existing stationery used sequential numbers (customer 1131, document 1132). The system
generates `quote_number` separately. Make sure:

- `quote_number` is unique, sequential and human-quotable — a DB sequence or
  `max(quote_number)+1`, not a random string.
- It is the **payment reference** printed in the banking panel: *"Use DD-1133 as your payment
  reference."*
- Continue from **1133** so it does not collide with the historical stationery.

## 5. Validity default

Existing quotes ran 90 days (09/08/2026 → 07/11/2026). Default `valid_until` to
**today + 90 days** on the create screen, editable. Add `quote_validity_days` to settings so
it is not hardcoded.

## 6. End-to-end check on the one real application

Application **DD-055941F7** (Daron Marshall Naidoo, Malawi, `d.naidoo@easternproduce.co.mw`)
is `submitted` and unactioned. He has **no portal account**, so he is the exact case the
register-first email variant exists for. Verify the whole path against him without sending:
approve → create quote → letterhead renders with real banking details → PDF downloads →
send is blocked or allowed correctly.

Note he is in **Malawi** — an international payment, so he needs the SWIFT code and the
bank's address, not just the branch code.

**The banking panel must serve both cases clearly**, because most clients are South African
and a minority pay from abroad:

- **Local (South Africa)** — account name, account number, **branch code 2749**. Do not lead
  with SWIFT; a domestic EFT does not use it and showing it first causes confusion.
- **International** — account name, account number, **SWIFT SBZAZAJJ**, bank name and bank
  address, plus the account holder's country.

Label the two groups explicitly ("Local payments" / "International payments") rather than
listing every field in one undifferentiated block.

Print `bank_account_note` in small italic text directly **beneath** the banking panel when it
is set. The account is in a personal name, and a first-time buyer sending R20,000+ to an
individual reasonably hesitates — this removes the doubt without Matt having to answer it by
email every time. Omit the line entirely when the setting is blank, and make it editable in
the Banking Details settings section.

---

## Critical warnings

- **Never** re-add a client UPDATE policy on `quotes`. RLS `WITH CHECK` cannot restrict which
  columns change; a client rewrote a R45,000 quote to R1 in testing. Acceptance is RPC-only.
- **Never** print VAT when `vat_number` is blank.
- Money is `numeric` — no float arithmetic. Use `formatAmount`.
- Banking details go on the quote but must never be logged or placed in a URL.
- `requireAdmin()` on every admin action; portal routes use the request-scoped client so RLS
  applies. No `createAdminClient()` in a portal route.
- No file over 300 lines.
- If you add a migration, **say clearly at the end of your run that it still needs applying** —
  Cursor cannot reach Supabase, and five migrations have already been left unapplied here.

## Verify

- [ ] Toggling "price on request" persists and disables the price input.
- [ ] A quote for a Fully Trained Protection Dog asks for an amount instead of prefilling R0, and sends once entered.
- [ ] A quote for an Elite Developed dog prefills R60,000.
- [ ] A tier at R0 with the flag off still blocks sending.
- [ ] Letterhead masthead shows the trading name; the From block shows **Matthys Diedericks t/a Diedericks Dobermanns**.
- [ ] **No empty "Reg No" or VAT label appears** — both are correctly blank for a sole proprietor.
- [ ] Letterhead shows the Eswatini address, both phone numbers, Standard Bank details, deposit terms.
- [ ] Banking panel separates **Local payments** (branch code) from **International payments** (SWIFT + bank address).
- [ ] The sole-proprietorship note prints beneath the banking panel, and disappears if the setting is cleared.
- [ ] **No VAT line appears anywhere** (vat_number is blank).
- [ ] Quote number is sequential from 1133 and appears as the payment reference.
- [ ] `valid_until` defaults to 90 days out.
- [ ] Editing any company/banking field in settings persists and shows on the next quote.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
