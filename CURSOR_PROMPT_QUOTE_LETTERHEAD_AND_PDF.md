# CURSOR PROMPT — Branded Quote Letterhead + Client Download / Print

**Run this together with `CURSOR_PROMPT_QUOTE_ACCEPTANCE_AND_PAYMENT_PROOF.md`** — the same
screens are touched. Read that prompt first, including its security correction (quote
acceptance must go through a `SECURITY DEFINER` RPC, never a client UPDATE policy).

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`.
Headings **Cinzel**, body **Lato**. Premium, dark, restrained — this document is the first
formal thing a buyer receives from the kennel.

---

## STOP — a blocking gap you must handle first

A quote asks someone to pay you. **There are no banking details anywhere in this system.**

`app_settings` currently holds only two relevant rows:

```
contact_email  diedericksdobermannssa@gmail.com
contact_phone  +27782150832
```

No company name, no registered address, no registration number, no VAT number, **no bank
account**. There is also **no logo file in `public/`** — only the default Next.js SVGs. The
crest exists in the mobile app at `assets/logo-full.png`.

A quote without banking details is unusable: the client cannot pay, so they can never upload
the proof of payment the rest of the flow depends on.

### Part 0 — company profile settings

Add these keys to `SETTINGS_KEYS` in `src/lib/settings.ts` and to the admin Settings screen
(`/admin/settings`), grouped as **Company Profile** and **Banking Details**:

| Key | Purpose |
|---|---|
| `company_name` | Legal trading name for the letterhead |
| `company_registration_number` | Company/CK number |
| `vat_number` | Blank if not VAT registered — if blank, the quote must **not** print a VAT line |
| `contact_address` | Physical/postal address (key already exists, unused) |
| `logo_url` | Crest for the letterhead (key already exists, unused) |
| `bank_name`, `bank_account_name`, `bank_account_number`, `bank_branch_code`, `bank_swift` | Payment details |
| `quote_terms` | Free text printed at the foot — deposit terms, validity, what the price includes |

Copy `assets/logo-full.png` from the app repo into `public/logo-full.png` as the default when
`logo_url` is unset. Every field must degrade gracefully: if a value is missing, omit that line
entirely rather than printing an empty label or "undefined".

**Warn on the quote screen** when banking details are incomplete: *"Banking details are not
set — the client will not know how to pay. Complete them in Settings → Company Profile."*

---

## Part 1 — the letterhead component

`src/components/documents/Letterhead.tsx` — one component, reused by quotes **and** invoices.
Do not build a quote-only version; the invoice needs the identical masthead.

Structure, top to bottom:

1. **Masthead** — crest centred or left, `DIEDERICKS DOBERMANNS` in Cinzel with wide letter
   spacing, the strapline *"Born with purpose. Built with discipline."* beneath in small caps,
   then a thin gold rule. This mirrors the litter announcement posters, which is the brand
   language your clients already recognise.
2. **Document title block** — "QUOTATION" (or "TAX INVOICE"), the number, issue date,
   valid-until. Right-aligned.
3. **From / To** — kennel details left (name, address, reg no, VAT if set, email, phone),
   client details right (name, email, phone).
4. **Line items table** — description, quantity, unit price, line total. Gold header rule,
   hairline row separators. Right-align all money.
5. **Totals block** — subtotal, discount, VAT if applicable, **total** emphasised in gold.
6. **Banking details panel** — bordered, clearly headed "PAYMENT DETAILS", with a note to use
   the quote number as the payment reference.
7. **Terms** — `quote_terms` if set.
8. **Footer** — thin gold rule, contact line, *"Excellence. Temperament. Protection. Loyalty."*

Accept a `variant` prop: `"screen"` (dark brand palette) and `"print"`.

## Part 2 — printing must not waste ink or look broken

**Do not print the dark theme.** A dark background either wastes a cartridge or renders as a
grey mess. Provide a print stylesheet that inverts to a **white page with black text**, keeps
the gold only as rules and accents, and hides all navigation, buttons and the site chrome.

```css
@media print {
  /* white paper, dark ink, gold reduced to accents */
}
```

Requirements:

- A4 with sensible margins; the whole quote fits one page where possible.
- The line-items table must not split a row across pages; repeat the header if it does span.
- Logo must print (`print-color-adjust: exact` on the crest and gold rules only).
- No URLs appended to links.
- Test at A4 **and** US Letter.

## Part 3 — client and admin actions

On `/portal/quotes/[id]` and `/admin/quotes/[id]`:

- **Print / Save as PDF** — triggers `window.print()` against the print stylesheet. This is the
  most reliable route to a PDF on every device and needs no library.
- **Download PDF** — server-side generation so the file is identical for everyone and can be
  emailed. Use the existing `pdf` approach in the repo if one exists; otherwise generate from
  the same React markup rather than hand-building a second layout in a PDF library. **The
  printed page and the downloaded PDF must not diverge** — one source of truth for the layout.
- Filename: `Quote-DD-XXXXXXXX-ClientName.pdf`.
- Attach the same PDF to the quote email from the acceptance prompt, so the client has it even
  if they never sign in.

## Critical warnings

- **`pricing_tiers` are all still R0.** A quote rendered today shows R0.00. Do not let a R0
  quote be sent or downloaded — block it with a clear message.
- If `vat_number` is blank, print **no** VAT line and do not label the total "incl. VAT".
  Implying VAT registration when there is none is a legal problem, not a formatting one.
- Money formatting via the existing `formatAmount` helper. Never float arithmetic.
- Banking details are sensitive-ish: they belong on the quote, but **never** log them or put
  them in a URL.
- No file over 300 lines — the letterhead will want splitting into masthead / items / totals.
- `requireAdmin()` on admin actions; portal routes use the request-scoped client so RLS applies.
  **Never** `createAdminClient()` in a portal route.

## Verify

- [ ] Quote renders on screen in brand colours, and prints as clean black-on-white A4.
- [ ] Crest and gold rules survive printing; nav and buttons do not appear.
- [ ] Downloaded PDF is visually identical to the printed page.
- [ ] With `vat_number` blank, no VAT line appears anywhere.
- [ ] With banking details blank, the admin sees the warning and the client sees no empty panel.
- [ ] A R0 quote cannot be sent or downloaded.
- [ ] Client can open, print and download their own quote; cannot reach anyone else's.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. If you add any migration, say
clearly at the end of your run that it **still needs applying** — Cursor cannot reach Supabase,
and four migrations have already been left unapplied in this project.
