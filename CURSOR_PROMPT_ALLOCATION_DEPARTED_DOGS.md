# Cursor Prompt — The dog-days engine does not know when a dog left

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

I tested both of yesterday's jobs against the live database on 18 Sep 2026.

**The litter announcement work is correct.** Nothing to do there — 130 gallery items, the column
dropped, the view enforcing visibility, both constraints rejecting bad rows when I tried them, and no
test rows left behind.

**The allocation backfill is correct on everything it was asked to do**, and I want to be clear about
that before the defect below:

| | |
|---|---|
| shared lines | 349 |
| shared lines with no allocation | **0** |
| allocation rows written | 8,230 |
| lines where allocations ≠ line amount | **0 of 351**, worst difference **R0.00** |
| dogs per line | 7 min, 23.6 average, 40 max |

And the as-at date resolution genuinely works — the dog count tracks the kennel's real growth:

```
2019   7 dogs      2023   25 dogs
2021  12 dogs      2025   28 dogs
2022  25 dogs      2026   27 dogs
```

That is the hard part and it is right.

---

## The defect

**75 allocations charge 12 dogs for expenses dated after they left the kennel. R11,167.25 across 7
expense lines.**

```
Chester — allocated an expense dated 14 Sep 2026.
          He left on 12 Aug 2026, ownership_status = 'deceased'.
```

By status: `with_owner` 36, `deceased` 21, `unknown` 18. **Sold dogs are the largest group** — a dog
that went to its new owner in March is still being charged for the kennel's feed in September.

### Cause

`dogs` records a departure in **two** places and the engine only reads one:

| column | populated |
|---|---|
| `deceased_at` | 25 dogs |
| `ownership_status` + `ownership_status_at` | the real record — includes `with_owner`, `deceased`, `unknown` |

**Four dogs have `ownership_status = 'deceased'` with `deceased_at` still null.** `dogDays.ts` tests
`deceased_at`, sees null, and keeps the dog on the property forever. It has no concept of a dog that
was *sold* at all.

Proof it is reading only `deceased_at`: my check for "charged after `deceased_at`" returns **0** —
that path works perfectly. It is the other 12 dogs, invisible to it, that leak.

### Why it matters more than R11,167

R11,167 of R1,374,431 is 0.8%, so the totals are close enough. That is not the point. This is the
engine that produces **cost per dog and the bitch-versus-bitch comparison**, and it is the
comparison, not the total, that the whole exercise exists for. A departed dog absorbing a share makes
every remaining dog look cheaper than it is, and the error grows every time a puppy is sold — which
is the normal case here, not the exception.

---

## Task

### 1. One function decides whether a dog was on the property on a date

In `src/lib/finance/dogDays.ts`, replace every direct read of `deceased_at` with a single exported
predicate, and make it the only place this question is answered:

```ts
/**
 * A dog counts for a date if it was born on or before that date and had not
 * yet left. Departure is `ownership_status_at` for any status other than
 * 'kennel' — `deceased_at` is a partial record: four dogs are marked deceased
 * by status with that column still null, and it says nothing at all about a
 * dog that was sold.
 */
export function wasOnPropertyOn(dog: DogLifecycle, on: Date): boolean
```

Departure date = the **earliest** of `ownership_status_at` (where `ownership_status <> 'kennel'`),
`deceased_at`, and `outcome_date` where present. Earliest, not first-non-null — a dog marked deceased
in August and sold in March left in March.

**A dog with no departure date and a non-kennel status is not resolvable.** Do not guess it is still
here. Leave it out from the date its status was last updated and list it as an exception.

### 2. Re-run the backfill over the affected lines only

The backfill script is re-runnable. Run it again for the **7 affected expense lines only** — delete
and rewrite the allocations for those lines, leave the other 342 untouched.

**The lines must still balance to the cent afterwards.** The R11,167 does not disappear; it
redistributes across the dogs that were actually there, and the rounding remainder goes on the
largest recipient as before.

Report the before and after for one line in full — the dogs dropped, the dogs whose share grew, and
the total unchanged.

### 3. Stop it recurring

Add a check to `reconcileAllocations.ts`, surfaced in the finance reconciliation screen alongside the
unbalanced-line list:

> **Allocations to dogs that had left** — *N lines, R X*

It must read zero. If it ever does not, the lifecycle data and the engine have diverged again, and
Matt sees it on the screen rather than finding it in a report six months later.

### 4. Fix the underlying data too

Four dogs carry `ownership_status = 'deceased'` with `deceased_at` null. **Do not silently backfill
the column** — list the four for Matt with their `ownership_status_at` dates and let him confirm, then
set `deceased_at` from the confirmed date in a one-off script with an undo record in `dbp_import`.

Then decide and say which: is `deceased_at` kept in step with `ownership_status`, or dropped in favour
of the status pair? Two columns for one fact is what caused this. Pick one and write down why.

### 5. Tests

- A dog sold on 1 Mar is excluded from an expense dated 2 Mar and included for 28 Feb
- A dog with `ownership_status = 'deceased'` and `deceased_at` null is excluded from its status date
- Departure takes the **earliest** of the three dates, not the first non-null
- A dog with a non-kennel status and no date is excluded and reported, never silently kept
- After re-running the 7 lines, all 351 lines still balance to the cent
- The reconciliation check reads zero

---

## Do not

- Do not re-run the backfill across all 349 lines. Seven lines are wrong; 342 are correct and their
  amounts are frozen.
- Do not change any allocation amount except on those seven lines.
- Do not backfill `deceased_at` without Matt confirming the four dogs.
- Do not add a third place to record that a dog has left.
- Do not create test dogs, expenses or allocations in production.

---

## Report

1. `wasOnPropertyOn`, and the list of every place that previously read `deceased_at` directly.
2. The 7 lines re-run, with one shown in full: dogs before, dogs after, amounts, total unchanged.
3. `select count(*)` proving allocations-to-departed-dogs is now 0.
4. All 351 lines still balancing to the cent, worst difference R0.00.
5. The four dogs needing `deceased_at`, listed for Matt — not changed.
6. Your decision on `deceased_at` versus `ownership_status`, and why.
7. `npx tsc --noEmit` clean in both repos.
