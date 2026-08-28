# CURSOR PROMPT — Cash received, cash expected, and profit over time

Matt wants three things in the finance area:

1. **Cash received** — what has actually landed
2. **Cash expected** — what is still to come, and when
3. **Profitability over time** — income minus expenses, by month

**Run this after `CURSOR_PROMPT_DEPOSITS_STATEMENTS_DEBTORS.md`** — it depends on invoices and
payments being wired to quotes.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency is **ZAR** throughout.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Everything needed already exists — read it before adding anything

- `invoice_payments` — cash in, with `payment_date`, `amount`, `payment_method` (123 rows)
- `invoices` — `amount_outstanding` and `due_date` (123 rows)
- `expenses` — cash out, with `expense_date`, `payable_due_date`, `is_payable`, `is_recurring`, `recurrence_interval`, `payment_account_id` (339 rows)
- `historical_income` — pre-system income (127 rows)
- `budgets` — 117 rows by year, month and category
- `payment_accounts` — FNB Business, FNB Savings, Petty Cash, Credit Card
- `litters.go_home_date` — **this is what dates the incoming balances.** Odessa × Santini goes home **6 Dec 2026**, Hannah × Hunter-King **5 Dec 2026**

**Add no new tables for reporting.** Build views or queries. A reporting table that has to be kept
in sync is a reporting table that will eventually disagree with the ledger it came from.

---

## 1 · Cash received — what actually landed

Actuals only, from `invoice_payments` by `payment_date`, plus `historical_income` for periods before
the system.

- By month, filterable by year and by payment account.
- Show the payment method split — a bank transfer and a card payment are the same money but not the same reconciliation.
- Drill from any month to the individual payments, and from a payment to its invoice and buyer.

**Never mix actual and forecast in the same number.** They may sit on the same chart, but forecast
must be visually distinct — lighter, or dashed — and labelled. A blended figure is a figure nobody
can act on.

## 2 · Cash expected — what is still to come

Two sources, both already in the data:

**Money in**
- Every invoice with `amount_outstanding > 0`.
- **Date it by the litter's `go_home_date`** where the dog is linked to a litter, since most buyers settle on or near collection. Fall back to `invoices.due_date`, then to the go-home date of the litter they are waiting on.
- Show the assumption on screen: *"R55 000 · expected 6 Dec — dated from the Odessa × Santini go-home date."* **A forecast whose basis is invisible gets trusted more than it deserves.**

**Money out**
- `expenses` where `is_payable` and not yet paid, dated by `payable_due_date`.
- Recurring expenses projected forward using `recurrence_interval` up to `recurrence_end_date`.
- Where a future month has no committed expenses, fall back to the `budgets` figure for that month and category, clearly marked as budget rather than commitment.

**Horizon:** next 6 months by default, extendable to 12.

**The shape this reveals matters.** Deposits arrive now, costs run steadily through gestation and
rearing, and the balances land in early December. **Make the trough visible** — its depth is the
number Matt needs, and it is the one thing a bank balance alone will never tell him.

## 3 · Profitability over time

**Income minus expenses, by month.** Cash basis — money in less money out in that month. Do not
attempt accrual, deferred income or revenue recognition. Matt has decided this deliberately.

- Monthly income, monthly expenses, monthly net, and a running cumulative net.
- A rolling 12-month total, so a single heavy month does not read as a trend.
- Compare against `budgets` where a budget exists for that month and category.
- Break income down by tier — standard, elite developed, protection dog — and expenses by category. **The useful question is not "did we make money" but "which part of the business made it."**
- Per-litter profitability where `expenses.litter_id` is set: what that litter cost to raise against what it earned. That is the number that tells Matt whether a pairing was worth repeating.

## 4 · Deposits held — one figure, not an accounting system

A single stat: **total deposits received against dogs not yet handed over.**

It is not a profit adjustment and must not alter any income figure. It answers one practical
question: *how much of the cash in the bank already has a puppy attached to it.* Label it exactly
that way.

---

## Where it goes

A **Cashflow** tab in the existing finance area, alongside budget and expenses. Three sections in
this order: received, expected, profit over time. Deposits held as a stat card at the top.

- Charts via the existing Recharts setup — do not add a second charting library.
- **Every figure drills through to its rows.** A number Matt cannot open is a number he cannot check, and he will stop trusting the page.
- CSV export on each section.
- Currency **ZAR**, formatted `R1 234,56` — space thousands, comma decimal.

## The app

Matt checks figures on his phone between other things. The app needs the **summary** — cash received
this month, expected next 30 days, net position, deposits held — and the monthly trend. **Leave the
drill-through and CSV to the website**; that is desk work, and a cramped table on a phone is worse
than no table.

---

## Rules

- No new tables for reporting. Views or queries only.
- Actual and forecast are never blended into one number.
- Every forecast states its basis on screen.
- Cash basis for profit. No deferred income.
- Deposits held never alters an income figure.
- Every figure drills through to its underlying rows.
- No file over 300 lines. `requireAdmin()` on every finance route.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Cash received for a past month matches `select sum(amount) from invoice_payments where payment_date between …` — paste both numbers.
- [ ] `historical_income` appears in periods before the system and is not double-counted with `invoice_payments`.
- [ ] Shayista's outstanding R55 000 appears in **December**, dated from the go-home date, with the basis shown.
- [ ] An invoice with no litter falls back to `due_date`, and says so.
- [ ] A recurring expense projects forward correctly and stops at `recurrence_end_date`.
- [ ] A future month with no committed expenses shows the budget figure, visibly marked as budget.
- [ ] Actual and forecast are visually distinct on every chart.
- [ ] Monthly net equals income minus expenses for that month — check one month by hand.
- [ ] Per-litter profitability returns a sensible figure for a litter with expenses allocated.
- [ ] Deposits held shows R10 000 today and changes no income figure.
- [ ] Every headline number drills through to its rows.
- [ ] A non-admin cannot reach any finance route — verify against RLS, not a hidden menu item.
- [ ] The app shows the summary and the trend, and matches the website's numbers exactly.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.
- [ ] For each app feature, confirm the file exists — `ls` the path and paste the output. Do not rely on grep alone; it has returned false negatives on this filesystem.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in both repos. Paste both hashes.
- [ ] Any migration is applied and confirmed against the live database before reporting done.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
