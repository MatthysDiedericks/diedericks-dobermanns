# Cursor Prompt — Cash on delivery, bank statements, and the bookkeeper's view

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

---

## What exists now

```
payment_accounts     Petty Cash [cash] · Credit Card [card]
                     Standard Bank · Discovery Bank · Absa
invoice_payments     145 rows, R2.37m
  by method          other 123 (R2,165,157) · eft 22 (R201,500)
  payment_account_id DOES NOT EXIST
bank statement tables none
```

Two things stand out. **No payment is linked to the account that received it** — `payment_accounts`
exists with five accounts and nothing points at it. And **123 of 145 payments are recorded as
"other"**, carrying R2.17m of the R2.37m total, so the payment method field is effectively empty.

Until a payment says which account took the money, nothing downstream — cash on hand, bank
reconciliation, or the bookkeeper's view — can be built honestly.

---

## Part 1 — Every payment names the account that received it

Migration, both repos, ending `notify pgrst, 'reload schema';`:

```sql
alter table public.invoice_payments
  add column if not exists payment_account_id uuid references public.payment_accounts(id),
  add column if not exists banked_on date,
  add column if not exists banked_reference text;

comment on column public.invoice_payments.payment_account_id is
  'Which account actually received the money. Cash received in hand points at Petty Cash until it is banked.';
comment on column public.invoice_payments.banked_on is
  'When cash received in hand was deposited. Null means it is still cash on hand.';
```

**Do not guess the account for the 145 existing rows.** Leave them null and surface them in the
reconciliation list in Part 4 for Matt to assign. A wrong account is worse than a blank one.

Make `payment_account_id` required on new payments.

## Part 2 — Taking the balance in cash at handover

On the invoice and in the fulfilment/handover flow, **Record payment** captures:

- amount, date, **account** (defaulting to Petty Cash when the method is cash)
- who received it
- an optional photo of the signed receipt

On save it must state what happened:

> *R10 000 cash received from Xana Garcia, 4 Nov 2026. Invoice DD-2026-0022 is now paid in full.*

When the payment settles the invoice, the client's account shows **paid in full** immediately — that
is the point of capturing it at the door, and it is what the client sees in their portal.

**Cash on hand is a balance, not a filing cabinet.** Show a running *Cash on hand* figure in finance:
every cash receipt not yet marked banked. A **Bank this cash** action takes one or many receipts,
sets `banked_on` and `banked_reference`, and moves them out of that balance.

That figure is the control that makes cash trustworthy. Without it, cash goes into a drawer and
nobody can say how much should be there.

## Part 3 — Bank statements

New tables:

```
bank_statements        account_id, period_start, period_end, opening_balance,
                       closing_balance, document_id, uploaded_by, uploaded_at
bank_statement_lines   statement_id, transaction_date, description, reference,
                       amount, matched_payment_id, matched_expense_id, match_note
```

Upload a PDF or CSV against one account and a period. Store the file in a **private** bucket — a bank
statement is not public, and the accountant reads it through a narrow view, never by a storage URL.

Parse CSV where the bank provides one. For PDFs, store the document and allow lines to be entered or
imported later — **do not build a PDF parser in this pass** and do not pretend a scan was read.

## Part 4 — Reconciliation

A screen that lines up statement lines against recorded payments and expenses for the same account and
period, and reports:

```
Statement lines matched to a payment            N
Statement lines with no match                   N
Recorded payments not on any statement          N
Payments with no account assigned               N   (all 145 today)
Cash on hand not yet banked                     R X
```

Matching is a suggestion — same amount, date within a few days — that Matt or the bookkeeper confirms.
**Never auto-match on amount alone.**

## Part 5 — The bookkeeper's view, and the one thing this prompt will not do

The `accountant` role already exists, reads through `accountant_sales_register` and
`accountant_purchase_register`, and has no access to contacts, dogs or storage. Extend it:

- **Bank statements and their lines**, for the accounts they work on
- **The reconciliation screen**, filtered to bank accounts — because reconciling a bank account
  against cash that never went through it is meaningless
- **Payments**, showing which account received each one

**What must NOT be built: a view of income that omits cash receipts.**

Filtering a *bank reconciliation* screen to bank transactions is correct and expected. Filtering the
*bookkeeper's view of revenue* so that cash sales do not appear is a different thing: it produces
financial statements and tax returns that understate income, prepared by someone who was not shown
the full picture and who is signing off on it.

So build it this way instead, which gives Matt the separation he actually needs:

- The bookkeeper sees **all** revenue, cash included
- Every payment is labelled by account, so cash is plainly distinguishable from banked money
- Cash not yet banked appears as **cash on hand**, which is exactly how it should read in a set of
  books, and it reconciles to a real number Matt can count
- The reconciliation screen, and only that screen, is scoped to the bank account being reconciled

If Matt wants the bookkeeper's default landing view to be bank-only for day-to-day work, that is a
sensible default and fine to build — as a **filter they can clear**, never as a permanent exclusion,
and the totals must always state which basis they are on.

**If you find yourself building a query that hides revenue from the accountant role, stop and report
it instead of shipping it.**

---

## Tests

- A payment cannot be saved without an account
- Cash received sets Petty Cash and appears in cash on hand
- Banking a receipt clears it from cash on hand and sets `banked_on`
- A cash payment that settles an invoice marks it paid in full and shows in the client portal
- The accountant sees cash receipts, labelled as cash, in revenue
- The reconciliation screen scoped to a bank account excludes cash, and says that it has
- The accountant still cannot read contacts, dogs or storage objects

---

## Do not

- Do not guess the account for the 145 existing payments.
- Do not auto-match statement lines on amount alone.
- Do not build a PDF statement parser in this pass.
- Do not put bank statements in a public bucket.
- Do not build any view that hides revenue from the accountant role.
- Do not create test payments or statements in production.

---

## Report

1. The migration, with the new columns read back from the live database.
2. A cash receipt captured at handover, with the confirmation message and the invoice going to paid.
3. The cash-on-hand figure, and one receipt moved through Bank this cash.
4. A statement uploaded and reconciled against payments.
5. The accountant's revenue view showing a cash receipt labelled as cash.
6. Proof the accountant still cannot reach contacts, dogs or storage.
7. `npx tsc --noEmit` clean in both repos.
