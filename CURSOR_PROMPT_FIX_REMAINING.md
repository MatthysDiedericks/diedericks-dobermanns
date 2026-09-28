# Cursor Prompt — The four things still outstanding

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both repos when done. Paste the real output.

I audited every prompt from 15 Sep 2026 against the live database and both repos. **Almost all of
it landed and is correct** — the status list, the dog search, the lineage strip, litter validation,
the delete impact confirmation, progeny totals, health entry on the dog, the photo rotation, the
pedigree rework, gallery per-file fields, puppy outcomes. Both repos, with tests. Good work.

Four things are wrong or missing. Nothing else.

---

## 1. Migration 0182 is only in one repo

`0182_litter_profitability_foundation.sql` exists in **`diedericks-dobermanns/supabase/migrations/`**
and **not** in `diedericksdobermann-web/supabase/migrations/`.

The standing rule on this project is that both repos carry a full, byte-identical migrations folder
for the one shared database. A website deployed from a clean checkout cannot reproduce the schema
it depends on.

**Copy `0182` into the website repo, byte-identical.** Then confirm both folders match file for
file — `0180`, `0181`, `0182` in both.

The migration itself is applied and correct. I verified against the live database: the constraint,
the 349 rows moved to `shared`, all three settings present, and the
`trg_dogs_recalc_litter_counts` trigger live. Do not re-run it or change it.

## 2. `company` is missing from the allocation types — and Matt asked for it specifically

The constraint 0182 created is:

```sql
check (allocation_type in ('shared', 'dog', 'litter'))
```

**There is no `company`.** Matt's requirement, in his words, was a vet invoice that also has
*"some equipment or toys, this is not the dog's expense but still an expense, which we would like
to capture on the same invoice but like HQ expenses"*.

Without `company`, those costs fall into `shared` and get spread across every dog by dog-days.
**That is worse than not splitting at all** — it makes each dog look more expensive than it is, and
quietly distorts the per-female comparison that the whole exercise exists to produce.

Add it: `check (allocation_type in ('company', 'shared', 'dog', 'litter'))` in a new migration, in
**both** repos.

`company` means **business overhead that never touches an animal's cost**: office, accounting and
legal, bank charges, software, marketing, kennel repairs, tools, cleaning materials, property
insurance. It must be excluded from every per-dog and per-litter figure by construction, not by a
filter someone might forget.

**Do not reclassify any existing rows.** The 349 now sitting in `shared` include real company costs,
but guessing which is not your call. Give Matt a bulk reclassify control on the expenses list and
let him do it.

## 3. One invoice still cannot be split — the header/lines model was not built

`expense_lines` and `expense_allocations` do not exist. `expenses` is still one flat row with one
`allocation_type`, one `dog_id`, one `litter_id`.

So this, which is a normal supplier document, still cannot be recorded truthfully:

```
Agrimark invoice 17702 — 28 Aug 2026 — R14,880.00
  Dog food, 8 × 20kg            R11,200   → shared
  Vet consult — Hunter-King      R 1,450   → dog
  Whelping box + heat lamp       R 1,680   → litter
  Brooms, hose fittings          R   550   → company
```

`CURSOR_PROMPT_EXPENSE_ALLOCATION_AND_REPORTS.md` said plainly that it supersedes the flat-table
approach in the profitability prompt, and that only one mechanism should be built. The flat one was
built. **Build the lines.**

Stage A of that prompt, unchanged:

- `expense_lines` — `expense_id`, description, quantity, unit_amount, line_amount, vat_rate,
  vat_amount, category_id, `allocation_kind` (`company` | `dog` | `litter` | `shared`)
- `expense_allocations` — `expense_line_id`, `dog_id`, `litter_id`, `amount`, `weight`, `basis_note`
- Migrate all 351 existing expenses into a header plus exactly one line, carrying their current
  `allocation_type` across
- The resolver as a pure, tested function

**The rule that matters most: resolve a shared split once, at capture, and store the amounts.**
Never recompute at report time. "The dogs currently on the property" changes weekly — if March's
feed bill is re-split every time a report runs, last quarter's cost-per-dog moves whenever a puppy
is sold, and no figure Matt quotes is reproducible. `basis_note` carries the explanation:
*"18 dogs on 28 Aug 2026, weighted by age."*

The existing `dogDays.ts`, `resolveAllocations.ts` and `allocation.ts` are good and should be the
engine underneath. Keep `expenses.allocation_type` on the header as the summary of a
single-line invoice, or drop it once lines exist — **say which you chose and why.**

**Stage A only. No UI. Report and stop.**

## 4. `validateLitter` allows two litter statuses that do not exist

`lib/litters/validate.ts`:

```ts
const BORN_STATUSES = new Set(["born", "placed", "available", "closed"]);
```

The database allows only `planned`, `expected`, `born`, `placed`. `available` and `closed` are dead
branches. Harmless today, but the file's whole purpose is to be the one place the business rules
live, and a rule that references a value the database rejects will mislead the next person reading
it. Remove them, in both repos.

**While you are there:** `CURSOR_PROMPT_LITTER_DELETE_AND_PUPPY_INTAKE.md` asked for **Archive**
rather than deletion when a litter has puppies. There is no archived value in the litters status
constraint. Say how you handled it — a new status, a boolean, or not implemented — rather than
leaving it ambiguous.

---

## Do not

- Do not re-run or edit migration 0182. It is applied and correct.
- Do not reclassify existing expense rows. Matt decides.
- Do not build a UI in this pass.
- Do not recompute allocations at report time.
- Do not create test expenses, litters or dogs in production.

---

## Report

1. Confirmation that `0180`, `0181` and `0182` are byte-identical in both migration folders — show
   the diff or the checksums.
2. The new migration adding `company`, and the constraint read back from the live database.
3. The `expense_lines` / `expense_allocations` migration, and a count proving all 351 expenses have
   exactly one line and balance to their header total.
4. The Agrimark invoice above, entered as one header with four lines across all four kinds, summing
   to R14,880.00.
5. Proof that re-running the resolver after a dog is sold **does not change** a stored allocation.
6. The `validate.ts` change, and your answer on Archive.
7. `npx tsc --noEmit` clean in both repos.
