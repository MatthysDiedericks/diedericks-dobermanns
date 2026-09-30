# Cursor Prompt — Profit per litter and per dog, and the cash / bank split

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both, plus `npm run parity`. Paste the real output.
3. Read `src/lib/finance/dogProfitability.ts` before writing anything. It already solves most of
   this correctly and its rules are deliberate — reuse it, do not write a second one.

---

## Part 1 — Litter financials is reading an empty table

`src/components/litters/LitterFinancialsTab.tsx` reads `litter_transactions`.

**`litter_transactions` has 0 rows.** Every litter shows *"No litter income or expenses yet"*,
on a system that holds:

| | |
|---|---|
| `expense_allocations` rows | **8 155** |
| …allocated to a litter | **1 570** |
| …allocated to a dog | **8 154** |
| `expenses` rows | 356 |
| `expenses.litter_id` set | **2** — this column is not how costs are allocated |

Costs live in **`expense_allocations`**, not in `expenses.litter_id` and not in
`litter_transactions`. The tab is querying a table nothing writes to.

Worked example — Cendra × Dharka, Jun 2026 (`11111111-1111-4111-8111-111111111003`):

```
cost allocated to the litter        R 1 830,40   (14 allocation rows)
invoiced across its puppies         R 55 000,00
received across its puppies         R 55 000,00
```

The tab currently shows nothing for that litter.

**Fix:** rebuild the tab on `expense_allocations` + invoices reached through
`dogs.litter_id → invoices.dog_id`. Then either drop `litter_transactions` in a migration or
leave it with a comment saying it is unused — do not leave a live query pointing at it.

## Part 2 — Invoiced and received are different numbers. Show both.

`countedIncome` in `dogProfitability.ts` sums `row.total` — the **invoice total**. The finance
dashboard's `totalIncome` in `src/lib/finance/queries.ts:154` sums **`amount_paid`**.

So the same litter can read R55 000 on one screen and R10 000 on another, and both are right.
Matt hit exactly this today: Bruce was invoiced R55 000 with only a R10 000 deposit received.

**Every profit surface — litter and dog — shows three figures, always:**

```
Invoiced     what was billed
Received     what is actually in hand
Outstanding  the difference, amber when non-zero
```

Net profit is calculated on **received**, and the label says so: *"Net (on money received)"*.
A litter that is invoiced but unpaid must not read as profitable. Offer invoiced-basis as a
toggle if useful, but received is the default, because that is the number Matt can spend.

## Part 3 — The finance dashboard: all money first, then the split

Matt's requirement, in his words: *"the big picture needs to show all money received"*, with
*"another button which shows money received through the bank and cash received"*.

So:

- **The headline card stays exactly as it is** — `Total income · Received`, every receipt
  regardless of where it landed. Do not filter it. Do not make cash a separate top-line figure.
- **Add a split view below it**, on a toggle: `All · Bank · Cash`. Selecting Bank or Cash filters
  the breakdown and the monthly chart, but the headline total stays whole and visibly unchanged,
  so it is obvious the split is a lens and not a different total.
- **Cash on hand** gets its own card next to the split: cash received where `banked_on is null`.
  That is a balance Matt can physically count, and it is the control that makes cash
  trustworthy. `accountant_cash_on_hand` already exists for this.

### The honest limitation you must surface, not hide

```
invoice_payments rows                148
…with payment_account_id set           2
expenses rows                        356
…with payment_account_id set           3
```

**146 of 148 payments do not say which account received them.** A bank/cash split today would
put almost everything in neither bucket.

So the split view needs a third, visible category — **Unassigned** — with its count and total,
and a link to assign them. Never silently drop unassigned money from the split, and never
default it into Bank: that would understate cash and quietly misstate the split.

Do **not** guess accounts for those 146 rows. Build an **assignment queue**: the payment, its
date, amount, method, invoice and client, with an account picker. Matt works through it. A
payment with `payment_method = 'cash'` may be pre-selected to Petty Cash as a *suggestion he
confirms*, never written automatically.

## Part 4 — Profit per dog already exists. Find out why it is not reachable.

`src/app/admin/(panel)/dogs/[id]/profitability/page.tsx` and `DogProfitabilityPanel` exist and
work off allocations. Check whether they are linked from the dog profile and from finance; if
not, link them. Do not rebuild them.

Add a **litter equivalent** at `/admin/litters/[id]` (a Financials tab, per Part 1) and a
**league table** in finance: every litter with invoiced, received, cost, net, and net per
puppy, sortable. That table is the thing Matt has actually been asking for — it answers "which
pairings make money" in one screen.

Reuse `dogProfitability.ts`'s conventions, especially this one, which is already in its header
comment and is correct:

> Missing income stays missing. A figure is "Not yet linked", never R0.

A litter with unlinked income must say so. Ten of 186 invoices name a dog, so most historical
litters will show "Not yet linked" — that is the truth and it is useful, because it tells Matt
where the linking work is. It must not render as R0 profit.

---

## Part 5 — Finance → Litter Report

A new report page at **`/admin/finance/litters`**, linked from the Finance page beside the
existing year and month selectors.

### 5a. The table — income per litter

One row per litter: dam, sire, whelp date, pups born, pups sold, **invoiced**, **received**,
**cost** (from `expense_allocations`), **net on received**, **net per puppy**. Sortable on every
column, defaulting to newest litter first.

### 5b. Year selector

Reuse the year / month control already on the Finance page rather than inventing a second one.
A litter belongs to the year of its `actual_date`. Add **All years**, and make it the default on
this report — a breeding programme is judged over its life, not a calendar year.

### 5c. The females comparison graph

Multi-select the dams, one line each, x-axis by year, y-axis income. Matt's words: *"a graph
that will show all selected females against each other"*. Default to every dam with at least one
litter. Lines use the same colour per dam across every chart on the page.

Offer two y-axis modes, because they answer different questions:

- **Income per year** — who is producing now
- **Cumulative** — lifetime earnings, the line that keeps climbing

### 5d. Lifetime income per female

A card or table row per dam: litters, pups born, pups sold, **lifetime received**, lifetime cost,
lifetime net, and **average net per litter**. This is the number that decides which females to
keep breeding, so it has to be either right or honestly blank.

### The coverage problem — read this before building any of it

This is not a small caveat. Checked live today:

| Dam | Litters | Pups sold | Invoices linked | Received |
|---|---|---|---|---|
| Cyrus | 6 | 32 | **0** | **R0** |
| Cuba | 4 | 13 | **0** | **R0** |
| Odessa | 4 | 19 | 1 | R34 566 |
| Cait | 3 | 11 | **0** | **R0** |
| Claire | 3 | 23 | 7 | R117 500 |
| Hailey | 3 | 17 | **0** | **R0** |
| Hannah | 2 | 8 | **0** | **R0** |
| Cendra | 1 | 1 | 1 | R55 000 |

**9 invoices are linked to a dog out of 124 sold puppies.** Separately,
`historical_income` holds **R2 305 157** across 127 rows, of which **0 have a `dog_id`** and 9
have a `dog_name` — so none of it reaches a litter or a dam on its own.

Built naively, this report tells Matt that **Cyrus — his most productive female, six litters,
thirty-two puppies sold — has earned nothing**, and that Cendra, with one puppy, is his best
producer. He would be making keep-or-retire decisions on an artefact of missing links.

So:

- **Never render unlinked income as R0.** Use `dogProfitability.ts`'s existing convention:
  *"Not yet linked"*. A dam with no linked income shows that phrase in the money columns.
- **Every total carries its coverage** — `income linked for 3 of 32 sold puppies` — next to the
  figure, not in a footnote.
- **A dam below, say, 80% coverage is not plotted as a solid line.** Draw it dashed, or exclude
  it from the chart with a visible note naming the excluded dams. A confident-looking line drawn
  from 3 of 32 puppies is the most dangerous thing this report could produce.
- **The page leads with the coverage banner** while coverage is poor: *"Income is linked for 9 of
  124 sold puppies. Figures below cover only linked sales."* with a link to the linking queue.

### The linking queue — what actually makes this report true

Exact-name matching between `dogs.new_owner_name` and `invoices.historical_client_name`:

```
sold puppies carrying buyer text      110
unlinked invoices naming a client     170
exact name pairs                       39
distinct puppies matchable             29
distinct invoices matchable            32
```

So roughly **29 puppies** could have income linked from an exact name match — a quarter of the
110, not all of them. Report that honestly rather than implying the gap closes itself.

Build it as the review queue described in Part 3: the puppy, its litter and dam, the candidate
invoice with client name, date and amount, and Confirm / Reject. **Matt confirms every link.**
Name matches here are suggestions only — `buyer_contact_id` drives portal scoping, and a wrong
link shows one client another client's dog.

---

## Already done today — do not redo or undo

- Migration **0196** is applied: `payment_account_id`, `banked_on`, `banked_reference`,
  the bank statement tables, and the `accountant_*` views.
- The **hard "must name an account" trigger was removed** and replaced with
  `trg_invoice_payments_default_cash_account`, which quietly puts cash into Petty Cash. It was
  removed because 0196 was applied **before** the UI that names the account was deployed, so it
  blocked every payment. **Re-add the strict trigger in the same push that ships
  `RecordPaymentPanel` with the account selector** — not before.
- `RecordPaymentPanel` is already edited in the repo: cash shows a read-only **"Held as: Petty
  Cash"**, other methods offer bank and card accounts only. Keep that behaviour — Matt asked for
  it specifically. Cash is not a bank account and must never be presented as one.
- Invoice **1087** (Bruce → Gerhard Nagel) is now fully paid: R10 000 EFT 9 Jun to Discovery
  Bank, R45 000 **cash** 27 Sep to Petty Cash, unbanked. Use it as your test case — it is the
  only invoice in the system with both a bank and a cash receipt.

## Do not

- Do not filter cash out of the headline total, or out of any revenue figure the accountant sees.
- Do not auto-assign accounts to the 146 unassigned payments.
- Do not calculate net profit on invoiced money by default.
- Do not show R0 where income is simply unlinked.
- Do not re-add the strict account trigger until the account selector is deployed.
- Do not create test invoices, payments or expenses in production.

## Report

1. Cendra × Dharka Financials tab showing R55 000 invoiced, R55 000 received, R1 830,40 cost,
   and the 14 allocation rows. Screenshot.
2. The litter league table, sorted by net per puppy.
3. The finance dashboard with All / Bank / Cash, the headline total unchanged across all three,
   and Unassigned showing its 146 rows.
4. The cash-on-hand card showing Gerhard's unbanked R45 000.
5. A litter with unlinked income reading "Not yet linked", not R0.
6. **The Litter Report** with the year selector on All years, the dam comparison chart in both
   income-per-year and cumulative modes, and the lifetime table. Screenshot.
7. **Proof Cyrus does not read as R0.** Her row must show "Not yet linked" with her coverage
   (0 of 32), and she must not be drawn as a solid zero line on the chart. This is the single
   check that says whether the report is safe to make decisions on.
8. The linking queue with its 29 suggested matches, each requiring confirmation.
9. `npx tsc --noEmit` clean in both repos, `npm run parity` clean.
