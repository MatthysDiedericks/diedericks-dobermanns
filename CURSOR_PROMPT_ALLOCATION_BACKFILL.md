# Cursor Prompt — Resolve the 349 historical shared lines

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

Verified against the live database on 16 Sep 2026: **everything else is done and correct.**

| | |
|---|---|
| Migrations `0180`–`0185` | in **both** repos, all applied |
| `litters.status` | now allows `archived` — Archive works |
| `expenses.allocation_type` | `company`, `shared`, `dog`, `litter` |
| `expense_lines` | 351 lines for 351 expenses, **0 unbalanced** |
| `validateLitter` | fixed — `born`, `placed`, `archived` |

The schema is well built: allocations cascade on line delete, there is a check that every
allocation has a recipient, the indexes are right, and the comments say plainly that amounts are
frozen at capture.

---

## The one thing left

```
expense_lines with allocation_kind = 'shared'   349
expense_allocations rows                          2
shared lines with no allocation                 349
```

**Every shared line in the history has no split.** Cost per dog, cost per litter and the female
scorecard will all read zero for everything before today — for **R1,376,223** of expenses.

`0184` is schema-only, which was right. But the reports Matt asked for are about *comparing* dogs
and litters, and a comparison that only starts from today is not one. Nine of his dams have
whelped across 24 dated litters; the value is in the history.

## Task — backfill, using the engine that already exists

Write a one-off script (not a migration — this is data, and it must be re-runnable and reversible)
that walks every `shared` line with no allocations and resolves it with `resolveAllocations.ts` /
`dogDays.ts`, using the **expense date** as the as-at date.

For each line:

- Work out which dogs the kennel held on that date, from `dogs.date_of_birth`, `status`,
  `deceased_at` and the litter dates — the dog-days engine already does this.
- Apply the stored weights: `dog_days_puppy_weight` 0.5, `dog_days_nursing_multiplier` 2.0.
- Write one `expense_allocations` row per dog, with `weight` and a `basis_note` naming the date and
  the count — *"18 dogs on 28 Aug 2026, weighted by age"*.
- **Allocations must sum to the line amount to the cent.** Put the rounding remainder on the
  largest recipient.

**Run it in a transaction, and report the numbers before committing.** If any line cannot be
resolved — no dogs on the property that day, a date before the first dog — leave it unallocated and
list it. Do not invent a split.

## What to watch for

**A line dated before any dog existed.** The earliest expenses may predate the records. Those stay
unallocated and appear in the report as exceptions. That is correct and honest.

**Do not touch the 2 existing allocations.** They were resolved properly at capture.

**Do not change `expense_lines` or the headers.** They balance; leave them alone.

**Once written, these amounts are frozen.** The same rule as capture — they must not move when a
dog is later sold. Prove it: after the backfill, re-run the resolver over a sample and show the
stored amounts are unchanged.

## Also

Add a **reconciliation check** to the finance section, if it is not already there:

```
Total expenses = company + dog + litter + shared
```

with a list of any line that has no allocation, or whose allocations do not sum to the line. That
list is how Matt will see the pre-records exceptions above, and it is what makes the whole model
auditable rather than merely computed.

---

## Do not

- Do not do this as a migration. A one-off script, re-runnable, that skips lines already allocated.
- Do not recompute or overwrite existing allocations.
- Do not guess a split for a line with no dogs on that date.
- Do not build the reporting screens in this pass.

---

## Report

1. The script, and its dry-run output: lines to resolve, allocations to create, total value covered.
2. After running: `shared lines with no allocation` should be 0, **or** a list of the exceptions
   and why each is unresolvable.
3. A single worked line — show the invoice, the date, the dogs on the property, the weights, and
   the amounts summing to the line total to the cent.
4. Proof that re-running the resolver after a dog is sold does not change a stored amount.
5. The reconciliation check, with the four categories summing to R1,376,223.
6. `npx tsc --noEmit` clean in both repos.
