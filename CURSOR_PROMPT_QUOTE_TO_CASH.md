# CURSOR PROMPT — Quote → invoice → statement → cashflow, dated by go-home

**This supersedes `CURSOR_PROMPT_DEPOSITS_STATEMENTS_DEBTORS.md` and
`CURSOR_PROMPT_CASHFLOW_AND_PROFITABILITY.md`.** Both were written before the database was checked
and both contain a wrong column name. Use this file.

One chain, end to end: an accepted quote becomes an invoice, payments land against it, the buyer and
Matt read the same statement, and the money still to come appears on a cashflow forecast dated by
when the dog actually goes home.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency **ZAR**, formatted `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — 18 Aug 2026. Build on these, do not re-derive

| Fact | Value |
|---|---|
| Accepted quotes | **1** — `DD-1139`, **R65 000** |
| Invoices raised from that quote | **0** |
| `invoices` rows | 123 — **all fully paid, R0,00 outstanding** (historical import) |
| `invoice_payments` rows | 123 |
| `waiting_list` rows carrying a deposit | 2 |
| Litters with a `go_home_date` | 26 |

**Column names — get these right, the old prompts had them wrong:**

- `quotes` has **`subtotal`** and **`total`**. There is no `total_amount`.
- `litters` has **`expected_date`**, **`actual_date`**, **`go_home_date`**, `whelp_date_earliest`, `whelp_date_latest`. There is no `expected_birth_date`.
- `waiting_list` has **no `contact_id`**.

**Upcoming go-home dates — these are what the forecast hangs on:**

```
Claire × Santini – Jul 2026     born        go home 18 Sep 2026
Hannah × Hunter-King – Jul 2026 expected    go home  5 Dec 2026
Odessa × Santini – Jul 2026     expected    go home  6 Dec 2026
```

---

## 0 · Blocker to fix first — `DD-1139` has no buyer attached

`quotes.contact_id` is **NULL** on the one accepted quote in the system. Shayista's name appears
nowhere on it.

**Nothing downstream can work until this is fixed.** A statement belongs to a person; an invoice
with no buyer cannot appear on a debtors list; a portal cannot decide whose statement to show.

- Link `DD-1139` to Shayista's contact record.
- Then make `contact_id` **required** when a quote is sent. Not when it is drafted — Matt builds
  quotes before he knows who they are for — but a quote cannot be *sent* to nobody.
- Check the other quotes for the same gap and report how many were affected.

---

## 1 · One invoice per sale

The dog costs R65 000. **That is the sale.** A deposit is a payment against it, not a second product.

`convertQuoteToInvoice()` already exists — **extend it, do not write a second path.** It must produce
**one** invoice for the full `quotes.total`, linked by `invoice.quote_id`.

`invoices` already carries `amount_paid`, `amount_outstanding`, `status`, `quote_id`, `due_date`.
`invoice_payments` is already the receipts ledger. Use them.

`waiting_list.deposit_invoice_id` and `balance_invoice_id` both exist — point **both** at the single
invoice and comment why. **Two invoices means two numbers to reconcile and a buyer who does not know
what she owes.**

## 2 · Verifying a proof of payment does everything else

Reviewing an uploaded proof is the one action that should drive the rest. In one transaction:

- write an `invoice_payments` row
- recalculate `amount_paid` and `amount_outstanding`
- move the invoice to `part_paid` or `paid`
- set `documents.review_status = 'verified'`
- advance the waiting-list entry to `deposit_paid` with `deposit_amount` and `deposit_paid_date`
- refresh the statement

**Pre-fill the amount from the invoice balance.** Matt must never retype a number that is printed on
the document in front of him.

**Alert Matt when a proof is uploaded.** Shayista's sat four hours unreviewed. Add
`PAYMENT_PROOF_UPLOADED` to the existing immediate-alert path and put an **"Awaiting review"** count
on the admin dashboard. Money arriving is not a daily-digest event.

## 3 · The statement — one set of rows, two audiences

A running ledger per buyer, oldest first: invoice raised, each payment, balance outstanding.

**The client portal and Matt's view read the same rows.** They must never be able to disagree.

Client sees: invoice number, what it is for in plain words, date raised, each payment with its date,
the balance, when it is due, and an **Upload payment proof** button while a balance remains.
Downloadable as a PDF through the existing letterhead builder.

Matt sees the same, plus the proof document attached to each payment, the method and reference, and
who verified it.

## 4 · Debtors

`/admin/finance/debtors`, built off `amount_outstanding`. **No new table.**

- **Total outstanding**, **deposits held**, **awaiting review** as three stats.
- One row per buyer: name, invoice, what they are buying, paid, outstanding, and status — **not yet due · due · overdue** by `due_date`.
- Group by those three bands. **An overdue balance and a balance not yet due are different problems** and must not sit in one list.
- **Show deposits held separately from money owed.** A deposit is cash received; an outstanding balance is revenue not yet collected. Adding them together overstates both.

---

# 5 · Cashflow — this is the part Matt asked for

Three sections, in this order, on a **Cashflow** tab in the existing finance area.

## 5a. Cash received — actuals only

From `invoice_payments` by `payment_date`, plus `historical_income` for periods before the system.

- By month, filterable by year and payment account.
- Show the payment-method split — a bank transfer and a card payment are the same money but not the same reconciliation.
- Drill from a month to the payments, and from a payment to its invoice and buyer.

## 5b. Cash expected — dated by go-home, not by invoice date

**This is the whole point.** Every invoice with `amount_outstanding > 0` is dated for forecasting as
follows, in this order of preference:

1. The **`go_home_date`** of the litter the dog belongs to
2. Failing that, the go-home date of the litter the buyer is waiting on
3. Failing that, `invoices.due_date`

**Because buyers settle the balance on or near collection.** Dating that money by the invoice date
puts R55 000 in August that will not arrive until December, and a forecast that is wrong in the
direction of optimism is worse than no forecast.

**Show the basis on screen, every time:**

> R55 000 · expected 6 Dec — dated from the Odessa × Santini go-home date

**A forecast whose reasoning is invisible gets trusted more than it deserves.**

**Money out:** `expenses` where `is_payable` and unpaid, dated by `payable_due_date`; recurring
expenses projected forward via `recurrence_interval` to `recurrence_end_date`; and where a future
month has no committed expenses, fall back to the `budgets` figure for that month and category,
**clearly marked as budget rather than commitment.**

**Horizon:** 6 months by default, extendable to 12.

**Make the trough visible.** Deposits arrive now, costs run steadily through gestation and rearing,
and the balances land in early December. The depth of the dip before that is the number Matt needs,
and it is the one thing a bank balance will never tell him.

**Never blend actual and forecast into one number.** They may share a chart, but forecast must be
visually distinct — lighter or dashed — and labelled.

## 5c. Profit over time

**Cash basis. Money in less money out, by month.** No accrual, no deferred income, no revenue
recognition — Matt has decided this deliberately.

- Monthly income, monthly expenses, monthly net, running cumulative net.
- A rolling 12-month total, so one heavy month does not read as a trend.
- Compared against `budgets` where one exists.
- Income broken down **by tier** — standard, elite developed, protection dog — and expenses by category. **The useful question is not "did we make money" but "which part of the business made it."**
- Per-litter profitability where `expenses.litter_id` is set: what a litter cost to raise against what it earned. **That is the number that says whether a pairing is worth repeating.**

## 5d. Deposits held — one figure, not an accounting system

A single stat: **total deposits received against dogs not yet handed over.**

It is not a profit adjustment and must not alter any income figure. It answers one question — *how
much of the cash in the bank already has a puppy attached to it* — and should be labelled exactly
that way.

---

## 6 · Fix Shayista as the live test

Do this **through the screens you just built**, not by script. It is the real test:

1. Link `DD-1139` to her contact.
2. Convert it to **one** invoice for R65 000.
3. Verify her proof of payment; record R10 000. Balance becomes R55 000.
4. Create her waiting-list entry — elite developed, female, brown & tan, docked — **dated 17 August**, when she committed, not today.
5. Stage `deposit_paid`, linked to the invoice.
6. Confirm her portal statement reads 65 000 − 10 000 = 55 000.
7. Confirm the R55 000 appears in **December** on the cashflow forecast, with the go-home basis shown.

---

## The app

Matt sees a payment land on his phone first.

- Debtors list, awaiting-review count, and **verify a proof from the phone**.
- The client's statement, readable in the app.
- Cashflow **summary only** — received this month, expected next 30 days, net position, deposits held, and the monthly trend.
- **Leave drill-through and CSV to the website.** That is desk work, and a cramped table on a phone is worse than no table. This is a justified platform difference, not a skipped feature.

## Rules

- One invoice per sale; deposits are payments against it.
- A sent quote must have a `contact_id`.
- Statement and admin view read the same rows.
- Forecast money in is dated by `go_home_date` first, and the basis is always shown.
- Actual and forecast are never blended into one number.
- Cash basis for profit. No deferred income.
- Deposits held never alters an income figure.
- Every headline number drills through to its rows.
- **No new reporting tables — views or queries only.** A reporting table that must be kept in sync will eventually disagree with the ledger it came from.
- No file over 300 lines. `requireAdmin()` on every finance route; portal routes use the request-scoped client so RLS applies.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] `DD-1139` is linked to Shayista, and you have reported how many other quotes had a NULL `contact_id`.
- [ ] Sending a quote with no contact is refused.
- [ ] Converting `DD-1139` produces **one** invoice of R65 000 with `quote_id` set. Show the row.
- [ ] Verifying the proof writes an `invoice_payments` row and sets `amount_outstanding = 55000`. Show it.
- [ ] Her portal statement shows 65 000, −10 000, balance 55 000, and the PDF matches.
- [ ] **A different client cannot see her statement.** Test with two real accounts.
- [ ] Debtors totals R55 000 outstanding and R10 000 deposits held, **shown separately**.
- [ ] Not-yet-due, due and overdue are separate groups.
- [ ] Cash received for a past month equals `select sum(amount) from invoice_payments where payment_date between …`. Paste both numbers.
- [ ] `historical_income` appears in pre-system periods and is **not double-counted** with `invoice_payments`.
- [ ] **The R55 000 appears in December, dated from the 6 Dec go-home date, with the basis visible on screen.** Screenshot or paste the label.
- [ ] An invoice with no litter falls back to `due_date` and says so.
- [ ] A recurring expense projects forward and stops at `recurrence_end_date`.
- [ ] A future month with no committed expenses shows the budget figure, visibly marked as budget.
- [ ] Actual and forecast are visually distinct on every chart.
- [ ] Monthly net equals income minus expenses — check one month by hand and show the arithmetic.
- [ ] Per-litter profitability returns a sensible figure for a litter with expenses allocated.
- [ ] Deposits held shows R10 000 and changes no income figure.
- [ ] Every headline number drills through to its rows.
- [ ] A non-admin cannot reach any finance route — **verify against RLS, not a hidden menu item**.
- [ ] The app shows the summary and trend and matches the website's numbers exactly.
- [ ] For each app file, `ls` the path and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Any migration is applied and confirmed against the live database before you report done.
- [ ] **Committing is not shipping.** Push, then confirm the Vercel build succeeded.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: contact linking, invoice conversion, statements, debtors,
cashflow, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
