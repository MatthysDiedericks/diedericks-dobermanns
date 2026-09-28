# Cursor Prompt — Four finance gaps. Nothing else.

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

I re-audited everything on 15 Sep 2026 against the live database and both repos. **Every other
prompt from today has landed and is correct** — status list, dog search, lineage strip, litter
validation, delete-impact confirmation, progeny totals, health entry on the dog, photo rotation,
pedigree rework, gallery per-file fields, puppy outcomes, the whelping flow, the weigh-in grid, and
the expense save confirmation. Both repos, with tests.

`CURSOR_PROMPT_FIX_REMAINING.md` was not run. These four items are exactly as they were.

---

## 1. Migration 0182 exists in one repo only

| | 0180 | 0181 | 0182 |
|---|---|---|---|
| `diedericks-dobermanns` | ✅ | ✅ | ✅ |
| `diedericksdobermann-web` | ✅ | ✅ | **missing** |

Both repos must carry a full, byte-identical migrations folder for the one shared database.
A website deployed from a clean checkout cannot reproduce the schema it runs on.

**Copy `0182_litter_profitability_foundation.sql` into the website repo unchanged.** Do not re-run
it and do not edit it — it is applied and correct. I verified the constraint, the 349 rows moved to
`shared`, all three settings, and the `trg_dogs_recalc_litter_counts` trigger, all live.

## 2. `company` is missing from the allocation types

Live constraint:

```sql
check (allocation_type in ('shared', 'dog', 'litter'))
```

Matt asked for this specifically — a vet invoice that also carries *"some equipment or toys, this
is not the dog's expense but still an expense, like HQ expenses"*.

Without `company`, those costs fall into `shared` and get spread across every dog by dog-days.
**That is worse than not splitting at all.** It inflates every dog's cost and distorts the
bitch-versus-bitch comparison the whole exercise exists to produce.

New migration, **both repos**:

```sql
check (allocation_type in ('company', 'shared', 'dog', 'litter'))
```

`company` = overhead that never touches an animal's cost: office, accounting and legal, bank
charges, software, marketing, kennel repairs, tools, cleaning materials, property insurance. It
must be excluded from every per-dog and per-litter figure **by construction**, not by a filter
someone has to remember.

**Do not reclassify any existing rows.** The 349 in `shared` include real company costs, but
guessing which is not your call. Add a bulk reclassify control to the expenses list and let Matt do
it.

## 3. One invoice still cannot be split

`expense_lines` and `expense_allocations` do not exist. `expenses` is still one flat row with one
`allocation_type`, one `dog_id`, one `litter_id` — so a normal supplier document cannot be recorded
truthfully:

```
Agrimark invoice 17702 — 28 Aug 2026 — R14,880.00
  Dog food, 8 × 20kg            R11,200   → shared
  Vet consult — Hunter-King      R 1,450   → dog
  Whelping box + heat lamp       R 1,680   → litter
  Brooms, hose fittings          R   550   → company
```

Build Stage A of `CURSOR_PROMPT_EXPENSE_ALLOCATION_AND_REPORTS.md`:

- **`expense_lines`** — `expense_id`, description, quantity, unit_amount, line_amount, vat_rate,
  vat_amount, category_id, `allocation_kind` (`company` | `dog` | `litter` | `shared`)
- **`expense_allocations`** — `expense_line_id`, `dog_id`, `litter_id`, `amount`, `weight`,
  `basis_note`
- Migrate all 351 expenses into a header plus exactly one line, carrying the current
  `allocation_type` across
- The resolver as a pure, tested function

**The rule that matters most: resolve a shared split once, at capture, and store the amounts.**
Never recompute at report time. The dogs on the property change weekly — if March's feed bill is
re-split whenever a report runs, last quarter's cost-per-dog moves every time a puppy is sold, and
nothing Matt quotes is reproducible. `basis_note` carries the explanation:
*"18 dogs on 28 Aug 2026, weighted by age."*

`dogDays.ts`, `resolveAllocations.ts` and `allocation.ts` already exist and are good — they are the
engine underneath this, not a replacement for it.

Decide whether `expenses.allocation_type` stays as a header summary or is dropped once lines exist,
and **say which and why.**

**Stage A only. No UI. Report and stop.**

## 4. `validateLitter` allows two statuses the database rejects

`lib/litters/validate.ts`, both repos:

```ts
const BORN_STATUSES = new Set(["born", "placed", "available", "closed"]);
```

The constraint allows only `planned`, `expected`, `born`, `placed`. `available` and `closed` are
dead branches. Harmless today — but this file exists to be the single place the business rules
live, and a rule naming a value the database refuses will mislead whoever reads it next.

Remove them.

**Also:** `CURSOR_PROMPT_LITTER_DELETE_AND_PUPPY_INTAKE.md` asked for **Archive** instead of
deletion when a litter has puppies. There is no archived value in the litters status constraint.
State how you handled it — new status, boolean flag, or not implemented — rather than leaving it
unclear.

---

## Do not

- Do not re-run or edit 0182.
- Do not reclassify existing expense rows.
- Do not build any UI in this pass.
- Do not recompute allocations at report time.
- Do not create test expenses, litters or dogs in production.

---

## Report

1. Checksums or a diff proving `0180`, `0181`, `0182` are identical in both migration folders.
2. The new `company` migration, with the constraint read back from the live database.
3. The `expense_lines` / `expense_allocations` migration, and a count proving all 351 expenses have
   exactly one line balancing to their header total.
4. The Agrimark invoice entered as one header with four lines across all four kinds, summing to
   R14,880.00.
5. Proof that re-running the resolver after a dog is sold **does not change** a stored allocation.
6. The `validate.ts` change, and your answer on Archive.
7. `npx tsc --noEmit` clean in both repos.
