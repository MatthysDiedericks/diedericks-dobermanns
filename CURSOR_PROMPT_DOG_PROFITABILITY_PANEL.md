# Cursor Prompt — Profitability on the dog profile

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.
3. **Three parts. Part 1 is not optional and must come first.** Read the numbers below to see why.

---

## Scope: breeding dogs only

**This panel appears on breeding dogs. Nowhere else.** Not on sold puppies, not on training dogs, not
on a client's animal. A puppy that was raised and sold has no profitability story of its own worth a
screen — it is a line inside its mother's.

A breeding dog is:

```sql
status in ('keep', 'stud')
  or exists (select 1 from litters l where l.mother_id = d.id or l.father_id = d.id)
```

That is **15 dogs today** — and the second half of the condition matters, because three of them are
dead:

| | Litters | Progeny |
|---|---|---|
| Hunter-King (stud) | 12 | 80 |
| Dharka (stud) | 10 | 51 |
| Cyrus | 7 | 37 |
| Odessa | 4 | 22 |
| **Cuba** (deceased) | 4 | 19 |
| Claire | 3 | 30 |
| Hailey | 3 | 18 |
| **Cait** (deceased) | 3 | 15 |
| **Chester** (deceased) | 3 | 14 |
| Hannah | 2 | 12 |
| Santini (stud) | 2 | 10 |
| Cendra | 1 | 2 |
| Cleopatra | 1 | 0 |
| Kim | 0 | 0 |
| Boesman (sold) | 1 | 0 |

**Cuba, Cait and Chester are deceased and they still need the panel.** They produced 48 puppies
between them. "What did that bitch return over her life" is a question you can only answer after she
is gone, and it is the question that decides which of her daughters to keep.

Kim has never bred: show the panel with the direct column and *"No litters yet"* where the
attributed column goes. Do not hide it.

Boesman's single litter has zero puppies — that is the leftover `z` test litter from 15 Sep, not a
real one. Do not build around it; it should be deleted separately.

Put the rule in **one exported function**, `isBreedingDog()` in `src/lib/dogs/breeding.ts`, and let
the profile decide whether to render the panel from that. It sits alongside `isKennelDog()` from the
My dogs tab and must not duplicate it — a kennel dog is not necessarily a breeding dog, and a
breeding dog may be deceased and therefore not a kennel dog.

---

## The numbers that decide the whole build

Counted live on 22 Sep 2026.

**Costs are attributed almost perfectly:**

```
expense_allocations to dogs      8,154 rows    R1,374,681
expense_allocations to litters   1,570 rows
```

**Income is attributed almost not at all:**

```
invoices                                185     R4,150,136
invoices carrying a dog_id                9     R  284,566   (6.9%)
historical_income rows                  127
historical_income carrying a dog_id       0
dogs with status = sold                 139
sold dogs with an invoice linked          8
sold dogs with dogs.price filled in       7
```

**139 dogs sold. Eight of them are connected to money.**

Build the panel on today's data and every brood bitch shows heavy costs against almost no income.
Cendra would read as a large loss. So would Odessa, Hailey, Claire and Cyrus. The screen would be
confident, precise, and wrong — and it would be wrong in the direction that makes Matt think his
breeding programme loses money.

That is worse than not building it. **Part 1 closes the gap. Part 2 builds the panel. Part 3 makes
the gap impossible to reopen.**

### What can actually be recovered

Do not promise more than this. Counted, not estimated:

| Route | Sold dogs it reaches |
|---|---|
| Already linked via `invoices.dog_id` | 8 |
| `quote_items.dog_id` where the quote converted to an invoice | 5 |
| `dogs.price` filled in | 7 |
| `dogs.buyer_contact_id` set (a person, not an amount) | 23 |
| **Sold pups whose litter has a known dam** | **123** |
| Sold pups with no litter link at all | 16 |

The overlaps are small and the honest total of dogs that can be linked to a real amount today is
**under twenty**. The remaining ~120 sales are in the 127 `historical_income` rows and the invoice
history, matched to a buyer name but never to a puppy.

---

## Part 1 — Connect income to dogs

### 1a. Automatic, where it is certain

A one-off script, re-runnable, that writes `invoices.dog_id` **only where the link is unambiguous**:

- A quote line carries `dog_id` and its quote converted to exactly one invoice
- An invoice has exactly one line item and that line carries a `dog_id`

Nothing fuzzy. **Do not match on a buyer's name** — that is the rule that stops one client's dog
appearing on another client's record, and it applies here exactly as it does to portal scoping.

### 1b. A screen for the rest — and link to the LITTER, not the puppy

Most of these cannot be inferred, so a human has to do it. **Because the panel is per breeding dog,
income only has to reach the litter, not the individual puppy.** That changes the size of the job
completely:

```
link every sold puppy to its sale     139 decisions
link every sale to a litter            24 decisions
```

**24 litters, from 9 dams.** An afternoon, not a project. Per-dam profitability needs "this litter
earned R X" — which puppy inside it earned what is a refinement Matt can do later, or never.

Build **`/admin/finance/link-sales`**: unlinked income on the left (invoice or historical row, with
date, amount, buyer name), candidate **litters** on the right — those whelped 8 to 16 weeks before
the payment date, with the dam and sire named. Matt picks, one click, next. Allow a puppy to be
chosen instead where he knows it, but never require it.

Running count — *"18 of 24 litters have income linked"* — so the work has a visible end.

Sort by amount, largest first. The top fifty payments carry most of the value.

### 1c. Make the next sale link itself

Converting a quote to an invoice must carry the `dog_id` across. Selling a dog from the fulfilment
pipeline must stamp it. **The reason this hole exists is that the link was never required at the
point of sale**, and no amount of backfilling fixes that for next month's puppies.

---

## Part 2 — The panel

### 2a. Smaller photo

Matt's words: the profile picture is too big. Reduce it and put the money summary beside it, so the
top of the profile answers *what is this dog and what has it done* without scrolling.

While you are there: the card shows **"COLLECTED 1211 DAYS AGO"** for Cendra, who is `status = keep`
and has never been collected by anyone. 1,211 days is her age. Find what that label is reading and
either fix it or remove it — a wrong fact in gold capitals is worse than a blank space.

### 2b. Two columns of money, never merged

This is the part to get right. A brood bitch earns nothing herself; her daughters do. Confusing the
two produces a number nobody can defend.

**Direct** — this animal alone

- Bought for (if purchased), sold for (if sold)
- Costs allocated to her: `expense_allocations` where `dog_id` is hers
- Her own vet, food share, registrations, training

**Attributed** — what she has produced, for breeding dogs only

- Litters whelped (dam) or sired (sire)
- Puppies born, alive, sold, retained
- Income from those puppies
- Costs allocated to those litters
- Net

Label them plainly. **Never add them into one "profit" figure.**

### 2c. Say what is missing, on the panel

Every figure states its coverage: *"Income from 3 of 9 puppies sold — 6 not yet linked"*, with a link
to the linking screen. A number that hides how much it is missing is the thing that makes people
distrust the whole system when they finally notice.

Where a dog has no linked income at all, show **"Not yet linked"**, not **R0**. They are not the same
and the difference matters.

### 2d. Full report behind a click

The summary opens a full report, filterable by **year**, **litter**, or **all time**. Line by line:
each invoice with its date, buyer and amount; each expense line with its allocation basis. Exportable
as CSV using the register export built last week.

For a dam, a per-litter breakdown — income, direct costs, share of shared costs, net, and cost per
puppy raised.

---

## Part 3 — Keep it honest

Add to the finance reconciliation screen:

```
Income not linked to a dog     N invoices, R X
Sold dogs with no income        N dogs
```

Both should fall towards zero as the linking screen is worked through. They are the honest measure of
whether these reports can be trusted yet.

---

## Tests

- A dam with linked puppy income shows attributed income; one without shows "Not yet linked", not R0
- Direct and attributed never sum into a single profit figure
- The coverage line counts linked and unlinked puppies correctly
- The auto-linker links only unambiguous cases and never matches on name
- Re-running the auto-linker changes nothing the second time
- A dog with no litter (16 of them) still renders

---

## Do not

- Do not build Part 2 before Part 1. A profitability screen over 6% income coverage is a misleading
  screen.
- Do not match income to a dog by buyer name.
- Do not show R0 where the truth is "not linked".
- Do not merge direct and attributed into one number.
- Do not estimate or apportion income that was never recorded. Missing is missing; say so.
- Do not create test invoices or dogs in production.

---

## Report

1. The auto-linker, with how many it linked and the count it refused as ambiguous.
2. The linking screen, with the running count out of 24 litters.
3. `isBreedingDog()` and its tests, and proof the panel does not render on a sold puppy.
4. Cuba's panel — deceased, 4 litters, 19 progeny — showing a lifetime return.
5. Kim's panel — no litters — showing the direct column and "No litters yet".
6. Cendra's panel: 1 litter, 2 progeny, both columns, coverage stated.
7. A dam with real linked income, showing the per-litter breakdown.
8. What the "COLLECTED 1211 DAYS AGO" label was reading, and what you did about it.
9. The two reconciliation counters.
10. `npx tsc --noEmit` clean in both repos.
