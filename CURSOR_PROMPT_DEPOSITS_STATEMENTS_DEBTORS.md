# CURSOR PROMPT — Deposits, statements, debtors, and "what dog does this buyer want"

A real case, live right now, that the system currently cannot represent.

**Shayista Ismail** accepted quote **DD-1139 for R65 000** on 17 Aug, paid a **R10 000 deposit**,
and uploaded proof of payment at 09:56 on 18 Aug. It has sat unreviewed. There is no invoice, no
balance, no statement — and **she is not on the waiting list at all**, despite having paid a deposit
for an *"Elite Developed Puppy — litter to be confirmed"*. She is invisible to the matching engine.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## 1 · One invoice, not two

The dog costs R65 000. **That is the sale.** A deposit is a payment against it, not a separate
product. Convert an accepted quote into **one** invoice for the full amount and record payments
against it.

`invoices` already carries `amount_paid`, `amount_outstanding`, `status`, `quote_id` and `due_date`.
`invoice_payments` is already the receipts ledger. **Use them.** Do not add a second invoice for the
balance — two documents means two numbers to reconcile and a buyer who does not know what she owes.

`waiting_list.deposit_invoice_id` and `balance_invoice_id` both exist; point **both** at the single
invoice, and comment why.

`convertQuoteToInvoice()` already exists — extend it, do not write a second path.

## 2 · Verifying the proof does all the work

Reviewing an uploaded proof of payment is the one action that should drive everything else. On the
document, in the payments screen and on the invoice:

**Verify** → asks for amount, date and method → then, in one transaction:

- writes an `invoice_payments` row,
- recalculates `amount_paid` and `amount_outstanding`,
- moves the invoice to `part_paid` or `paid`,
- sets `documents.review_status = 'verified'`,
- advances the waiting-list entry to `deposit_paid` with `deposit_amount` and `deposit_paid_date`,
- refreshes the client's statement.

**Query** → records a reason, notifies nobody automatically, and flags it for Matt to raise himself.

**Matt must never retype an amount that is already on a document he is looking at.** Pre-fill from
the invoice balance and let him correct it.

**Alert Matt when a proof is uploaded** — this one sat four hours. Add `PAYMENT_PROOF_UPLOADED` to
the existing immediate-alert list with the buyer, quote number and amount, and put an **"Awaiting
review"** count on the admin dashboard. Money arriving is not a daily-digest event.

## 3 · The statement — same numbers, both sides

A running ledger per client, oldest first: invoice raised, each payment, balance outstanding.

**The client's portal and Matt's view read the same rows.** They must never be able to disagree.

Client sees: invoice number, what it is for in plain words, date raised, each payment with its date,
the balance, and when it is due. Downloadable as a PDF through the existing letterhead builder, and
an **Upload payment proof** button when a balance is outstanding.

Matt sees the same plus: proof documents attached to each payment, method and reference, and who
verified it.

## 4 · Debtors report

`/admin/finance/debtors`, built off `amount_outstanding` — no new table.

- **Total outstanding**, **deposits held**, **awaiting review**.
- One row per client: name, invoice, what they are buying, paid, outstanding, and status — **not yet due · due · overdue** by `due_date`.
- Group by those three bands. **An overdue balance and a balance not yet due are different problems** and must not sit in one list.
- Filter by status, sort by amount or age. CSV export.
- Show **deposits held separately from money owed.** A deposit is a commitment received; the outstanding balance is revenue not yet collected. Conflating them overstates both.

## 5 · Make it obvious what dog each buyer wants — this is the point of the waiting list

The waiting list must answer, at a glance, **what each person is waiting for**. Today it shows a
name and a stage.

Every row shows a compact requirement summary, built from `preferred_category`, `preferred_sex`,
`preferred_colour`, `tail_preference` and `preference_notes`:

```
Shayista Ismail        Elite developed · female · brown & tan · docked
R10 000 paid · R55 000 due          waiting 1 day · deposit paid
```

- **Where they have no preference, say "any"** — not a blank. A blank reads as missing data; "any" is information, and it means she matches everything.
- Where the quote named a **specific litter**, show it: *"place in Odessa × Santini, due 27 Sep"*.
- Where a specific **puppy** is allocated, show its name and collar.
- **Deposit paid, and how much**, on the row. That is who has committed money and must be served first.
- Days waiting, prominent — you asked for longest-waiting to be visible as priority.
- Filter by category, sex, colour, tail and stage, so "who wants a brown female" is one click when a litter is born.

**Back-fill the requirement fields from each buyer's accepted quote and their application** where
the waiting-list entry is blank. **Do not overwrite anything entered by hand.**

## 6 · The breadcrumb must show the money, and must not let a dog leave unpaid

There are **two breadcrumb components** — `src/components/portal/JourneyBreadcrumb.tsx` for the
client and `src/components/waitlist/PipelineBreadcrumb.tsx` for admin — with two separate step
vocabularies. **Two definitions of the same sale will drift**, and then Matt and the buyer are
looking at different pictures of where things stand.

**Make both read from one shared step definition.** One module, one list of stages, one set of
labels. The two components differ only in what they are allowed to show, never in what the steps
are.

### Attach the money to the steps

The stages describe where the buyer is. They say nothing about what has been paid, which is the
buyer's actual question at that moment. Each step that involves money shows it inline:

```
Quote sent          DD-1139 · R65 000                       17 Aug
Deposit paid        R10 000 received · R55 000 outstanding  18 Aug
Matched             —
Balance paid        R55 000 due before collection           pending
Handover            —
```

**One breadcrumb answers both questions** — where am I, and what do I owe. Do not build a separate
payment strip beside it.

### Add one stage: `balance_paid`

```sql
alter table public.waiting_list drop constraint if exists waiting_list_pipeline_stage_check;
alter table public.waiting_list add constraint waiting_list_pipeline_stage_check
  check (pipeline_stage in (
    'enquiry','application','approved','quote_sent','deposit_paid','matched',
    'reserved','balance_paid','handover_complete','on_hold','do_not_sell','withdrawn'));
```

It sits between `reserved` and `handover_complete`, and is set automatically when
`invoices.amount_outstanding` reaches zero — not by hand. **The ledger decides it, not a person.**

### Block handover while money is outstanding

**`handover_complete` cannot be set while the invoice has a balance.** Not a warning that can be
clicked past — a block.

Provide an **override** that requires a typed reason and records who did it. Matt will occasionally
hand over on trust, and that should be a deliberate act with his name on it, visible afterwards on
the breadcrumb: *"Handed over with R55 000 outstanding — Matt, 12 Dec: buyer collecting, paying on
arrival."*

Show the same guard in the app.

## 7 · Fix Shayista's record as the test case

Do not do this by script. Use the screens you have just built — it is the real test:

1. Convert DD-1139 to an invoice for R65 000.
2. Verify her proof of payment; record R10 000. Balance becomes R55 000.
3. Create her waiting-list entry — elite developed, female, brown & tan, docked — **dated 17 August**, when she committed, not today. Her wait is counted from then.
4. Stage `deposit_paid`, linked to the invoice.
5. Confirm her portal statement shows R65 000 − R10 000 = R55 000.

**Report the currency before you start.** The quote is stored as `ZAR`; Matt refers to the amounts
as E (Emalangeni). They are pegged 1:1 so the arithmetic is identical, but the invoice, statement and
contract must all say the same thing. **Ask, do not assume.**

---

## The app

Matt sees a payment land on his phone first. The app needs: the debtors list, the awaiting-review
count, **verify a proof from the phone**, and the waiting list with the same requirement summary and
filters. The client's statement is readable in the app too.

---

## Rules

- One invoice per sale. Deposits are payments against it.
- Client statement and admin view read the same rows — never two sources.
- Never auto-message a client. Alerts go to Matt only.
- "Any" is shown as a preference, never as a blank.
- Deposits held are reported separately from outstanding balances.
- Back-fill never overwrites a hand-entered preference.
- No file over 300 lines. `requireAdmin()` on admin actions; portal routes use the request-scoped client so RLS applies.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste command output for the data checks

- [ ] Converting DD-1139 produces **one** invoice of R65 000 linked to the quote.
- [ ] Verifying the proof writes an `invoice_payments` row and sets `amount_outstanding = 55000` — show the row.
- [ ] Shayista's portal statement shows 65 000, −10 000, balance 55 000, and the PDF matches.
- [ ] A client cannot see another client's statement — test with two real accounts.
- [ ] The debtors report totals R55 000 outstanding and R10 000 deposits held, shown separately.
- [ ] Not-yet-due, due and overdue are separate groups.
- [ ] Shayista appears on the waiting list dated **17 August**, stage `deposit_paid`, showing "Elite developed · female · brown & tan · docked" and "R10 000 paid · R55 000 due".
- [ ] A buyer with no colour preference shows "any", not a blank.
- [ ] Filtering the waiting list by female + brown & tan returns her.
- [ ] Uploading a proof of payment alerts Matt within minutes and increments the awaiting-review count.
- [ ] Both breadcrumbs import their steps from **one shared module** — name the file.
- [ ] Shayista's breadcrumb reads "Deposit paid — R10 000 received · R55 000 outstanding" on her portal and on the admin waiting list.
- [ ] Recording the final R55 000 sets `balance_paid` **automatically**, with no one clicking a stage.
- [ ] Marking handover complete with a balance outstanding is **blocked**, not merely warned.
- [ ] The override requires a typed reason, records the user, and the reason appears on the breadcrumb afterwards.
- [ ] The app enforces the same block and shows the same money on the steps.
- [ ] Verifying from the app works and produces the same result as the website.
- [ ] Back-filling preferences did not overwrite any hand-entered value.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.
- [ ] Every app feature in this prompt exists — run `grep -rl "<term>" lib components app hooks` for each and paste the output.

### Prove it reached the remote

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] Any migration is **applied and confirmed against the live database** before reporting done.
- [ ] `git log origin/main -1` matches `HEAD` in both repos — paste both hashes.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
