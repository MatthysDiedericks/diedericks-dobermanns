# Cursor Prompt — The matcher does not match, and allocation needs to work from the litter

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.
3. **Part 1 before Part 2.** Building an allocation board on a matcher that returns nothing is
   building a screen that looks broken.

---

## The algorithm is good. The data it needs is not there.

`src/lib/waitlist/matching.ts` is well written — hard filters, weighted scoring, a `perfectFit` flag,
waiting time normalised across the queue, sensible tie-breaks. Keep it. **Do not rewrite it.**

But run it against the live database, 29 Sep 2026, and it produces almost nothing:

```
matchable waiting list entries (approved, quote_sent, deposit_paid)    16
available dogs                                                          7
```

The seven available dogs:

```
K1  no tier | puppy | female | black_tan | tail NOT RECORDED
K2  no tier | puppy | female | black_tan | tail NOT RECORDED
K3  no tier | puppy | female | black_tan | tail NOT RECORDED
K4  no tier | puppy | male   | black_tan | tail NOT RECORDED
K5  no tier | puppy | female | black_tan | tail NOT RECORDED
K6  no tier | puppy | female | black_tan | tail NOT RECORDED
Zues  protection_dog | adult | male | colour not set | tail NOT RECORDED
```

### Fault 1 — `perfectFit` can never be true

`tail_type` is **null on all seven** available dogs. Every matchable entry states a tail preference —
14 want docked, 2 want natural.

`scoreTail` returns `matched: false` when the dog's tail is not recorded. `statedPreferencesMet`
requires sex **and** colour **and** tail to match. So `perfectFit` is **false for every possible
pairing in the system**, and `perfectFit` is the first sort key in `rankBuyersForDog`.

The matcher's headline feature is dead, and it will stay dead until tails are captured.

**Fix both ends.** Treat "tail not recorded" as unknown rather than a mismatch — score it 0 but do not
let it block `perfectFit`, and show *"Tail not recorded"* as a warning on the row. Then make
`tail_type` a required field when registering a newborn, alongside sex and collar colour.

An unknown is not a mismatch. Conflating them is what makes the whole feature silent.

### Fault 2 — `elite_developed` buyers can never match anything

```
buyers wanting standard          9
buyers wanting elite_developed   7
```

`categoryMatches` demands `preferred_category === dogProgrammeCategory(dog)`. For the six available
puppies `programme_tier` is null, so they resolve to `standard`. Zues resolves to `protection`.

**No available dog can ever resolve to `elite_developed`.** Those seven buyers — nearly half the
queue, and the higher-value half — match nothing, forever, silently.

Decide which of these is true and implement it, saying which you chose:

- A puppy only becomes `elite_developed` once it enters the programme, in which case the matcher must
  show those buyers *"no dogs in this tier yet"* rather than an empty list; **or**
- A puppy in a litter intended for the elite programme should carry that tier from birth, in which
  case `litters.default_programme_tier` (the column exists) must flow to each puppy on registration.

Either way: **when a filter removes every candidate, say so.** *"7 buyers want Elite developed; no
available dog carries that tier"* is useful. An empty list is not.

### Fault 3 — a dead status clause

```ts
export function isMatchableDogStatus(status) {
  return status === "available" || status === "puppy";
}
```

**No dog has `status = 'puppy'`.** 158 have `category = 'puppy'`. Puppy is a category, not a status —
the same confusion that broke the register-pups screen on 15 Sep, where `status: 'puppy'` was rejected
by `dogs_status_check` and every registration failed silently.

Harmless today because `available` carries it, but it is a false statement in the code. Remove it, or
correct it to test `category`. Check the rest of the file for the same mistake.

---

## Part 2 — Allocate from the litter

Keep dog-to-buyer matching exactly as it is: when a dog is for sale, Matt needs the ranked buyers for
it. That direction stays.

Add the litter direction, because at whelping the question reverses: **eight puppies have arrived,
who gets which.**

### The allocation board — `/admin/litters/[id]/allocate`

Puppies down the left, in birth order, each showing collar colour, sex, colour and current allocation.
Select a puppy and the ranked buyers appear beside it, using `rankBuyersForDog` unchanged.

For each candidate: name, days waiting, stage, preference chips, the score breakdown already produced
by `MatchCriterion`, and any mismatches spelled out. Allocating is one action.

Three things the board must handle that a single-dog view does not:

**A buyer can only be allocated one puppy in the litter.** Once allocated they disappear from the
other puppies' lists, with an undo. Two puppies promised to the same person is the failure this screen
exists to prevent.

**Show the whole litter's state at once** — allocated, unallocated, reserved — so Matt can see six of
eight placed without clicking through.

**Sibling groups.** `waiting_list.sibling_group_id` exists. Two entries in one group want two puppies
from the same litter; surface that so they are handled together rather than one being allocated and
the other forgotten.

### Also on the litter

A **"Suggest allocation"** action that proposes a whole-litter assignment in one pass — the ranking
already exists, this just walks the puppies and takes the best unallocated buyer each time.

**It proposes; it never commits.** Matt reviews and confirms or changes each line. A breeder's
judgement about which family gets which puppy is not something to automate away, and the data is not
good enough to pretend otherwise.

---

## Tests

- A dog with `tail_type` null can still be a `perfectFit` when sex and colour match, and shows the
  "tail not recorded" warning
- A buyer wanting `elite_developed` with no such dog available sees the reason, not an empty list
- `isMatchableDogStatus` no longer references a status that does not exist
- Allocating a buyer to one puppy removes them from the other puppies in that litter
- Undo restores them
- Suggest allocation proposes without saving
- A sibling group is surfaced together

---

## Do not

- Do not rewrite the scoring algorithm. It is sound; its inputs are not.
- Do not treat an unrecorded field as a mismatch anywhere in the matcher.
- Do not auto-commit a suggested allocation.
- Do not allow one buyer two puppies from one litter without an explicit override.
- Do not match a buyer to a dog by name anywhere.
- Do not create test allocations, dogs or waiting list entries in production.

---

## Report

1. The three faults fixed, each with the before and after count of candidates it produces.
2. Your decision on `elite_developed`, and why.
3. `rankBuyersForDog` run live against K4 (the only available male) — the ranked list, with scores.
4. The allocation board with a real litter.
5. A suggested allocation proposed and then changed before saving.
6. `npx tsc --noEmit` clean in both repos.
