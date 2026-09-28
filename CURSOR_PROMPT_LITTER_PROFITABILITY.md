# Cursor Prompt — Profitability per litter, and per breeding female

## Do this first

1. Read the whole file before writing any code. The reasoning matters more than the tasks.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **This is staged. Do stage A only, report, and stop.** Stages B and C follow after review.
4. `npx tsc --noEmit` in both repos at the end of each stage. Paste the real output.

---

## What DogBreederPro actually does, and why copying it would be pointless

I inspected the live DogBreederPro account on 15 Sep 2026.

**Their puppy intake is seven fields.** `/dashboard/litter/puppies/by_dog/{damId}` returns exactly:
`puppy_number, stillborn, died_early, puppy_name, pet_name, gender, gender_unsure`. No birth
weight, no birth time, no collar, no coat colour. It is a roll-call, not a whelping record — you
tick that a pup exists and whether it lived, then go somewhere else for everything that matters.
**Do not copy that.** Our Add Puppy row (see `CURSOR_PROMPT_LITTER_DELETE_AND_PUPPY_INTAKE.md`) is
already richer.

**Two of their seven fields are worth taking:** `stillborn` and `died_early`. We have no way to
record a pup that was born dead or died in the first days. That matters for honest litter
averages, for the dam's record, and for profitability — a litter of ten with two stillborn has
eight to sell.

**Their per-litter finance is real in the schema and empty in practice.** Every transaction can
carry a `litter_id` and a `dog_id`. Of **479 transactions, 2 have a litter** and 37 have a dog.

**Ours is exactly the same, and just as empty:**

| | |
|---|---|
| Expenses | **351**, totalling **R1,376,223** |
| Tagged to a litter | **1** |
| Tagged to a dog | **1** |
| `allocation_type = 'general'` | **349** |
| Invoices tagged to a litter | 9 of 183 |
| `litter_transactions` table | **0 rows** — built, never used |

**So the reason nobody has ever got per-litter profitability is not a missing field. It is that the
biggest costs cannot be tagged to a litter by hand.** Look at where the money goes:

`Feed & Nutrition 93 · Veterinary 68 · Staff 53 · Transport 41 · Equipment 32`

Nobody is going to split a R14,000 feed invoice across four concurrent litters, every month, by
hand. They never have and they never will. A report built on manual tagging will show two tagged
litters and a rounding error.

**The upgrade is not a better tagging screen. It is allocation.**

---

## The model

Three classes of cost, handled three different ways:

**1. Direct to a litter** — stud fee, progesterone testing, C-section, whelping supplies, puppy
vaccinations and dewormings, microchips, registrations, puppy food while on the ground.
*Tagged by hand, because they are litter-specific by nature and there are few of them.*

**2. Direct to a dog** — purchase or import cost, health testing, her training, her showing, her
own vet work. *Tagged by hand to the dog.*

**3. Shared kennel overhead** — feed, staff, transport, insurance, equipment, utilities, general
vet retainer. **Never tagged. Always allocated by rule.** This is the money that has been invisible
per-litter, and it is the majority of R1.38m.

### The allocation rule: dog-days

For any period, spread shared costs across the **dog-days** in that period:

- Every dog on hand counts one dog-day per day.
- A litter's puppies count from birth until they go home.
- The dam counts her own dog-days throughout, and carries extra weight while nursing — she eats
  substantially more. Make the nursing multiplier a **setting**, default **2.0**, so Matt can tune
  it rather than argue with a hard-coded number.
- A puppy's dog-day is worth less than an adult's. Also a setting, default **0.5**.

Then: *a litter's share of a month's feed bill = (that litter's weighted dog-days ÷ all weighted
dog-days that month) × the feed bill.*

This is defensible, it needs no extra data entry, and it produces a number Matt can put in front of
an accountant. A litter of ten pups nursing for eight weeks will carry a large slice of the feed
bill, which is correct, and a retired dog in the corner will carry a small one, which is also
correct.

**Show the working.** Every allocated figure must be openable: *"R4,812 of Feed & Nutrition —
1,204 of 6,310 weighted dog-days in Jul–Sep 2026."* An unexplained number in a profitability report
gets ignored the first time it looks surprising.

### Female profitability — the part that has never existed

For each breeding female, over her whole life with the kennel:

```
  Income from every puppy she has produced
− Her direct costs        (purchase/import, health testing, training, showing, her own vet)
− Her share of shared overhead   (her dog-days across her whole life)
− The allocated cost of each of her litters
= Lifetime contribution
```

Plus the figures that drive decisions: **contribution per litter**, **contribution per puppy
reared**, and **cost per day of her non-breeding time**. Nine of your dams have whelped and there
are 24 litters with a birth date, so this can be computed for real today.

**Be careful with the dam's purchase cost.** A dam bought for R40,000 who has produced four
litters should not have the whole R40,000 land on litter one. Amortise it across her expected
productive litters — a setting, default **5** — and show the unamortised remainder separately so
a dam retired early shows the loss honestly rather than hiding it.

---

## Stage A — the foundation. Do this and stop.

**1. Record puppies that did not survive.** Add `outcome` to the puppy intake: `live`, `stillborn`,
`died_early`, with an optional date and note. Check whether `dogs` can carry this or whether a
small `litter_outcomes` table is cleaner — **look first, and say which you chose and why.** It must
flow into the litter's counts: born, live, sold, retained, died.

**2. Make the three cost classes real.** `expenses.allocation_type` already exists with values
`general`, `litter`, `dog` — 349 rows are `general`. Give it meaning:

- `litter` + `litter_id` → direct to that litter
- `dog` + `dog_id` → direct to that dog
- `shared` → enters the allocation pool

Migrate the 349 `general` rows to `shared` **only after confirming with a count what that does**,
and leave a way to reclassify in bulk from the expenses screen — Matt will want to pull the
obviously-direct ones out.

**3. Build the dog-days engine.** A function that, for a date range, returns weighted dog-days per
dog and per litter, using `dogs.date_of_birth`, `litters.actual_date`, `litters.go_home_date`,
`dogs.status` and `dogs.deceased_at`. Pure, testable, no UI. Put the multipliers in settings.

**Stage A report:** the outcome field working, the reclassified expense counts, and the dog-days
function with a test proving the Claire × Santini litter of 10 pups born 10 Jul 2026 produces the
dog-day count you would expect by hand.

## Stage B — the litter P&L *(do not start until Stage A is reviewed)*

A **Financials** tab on the litter showing income, direct costs, allocated share, and net — every
allocated line openable to its working. Income comes from `invoices` joined through the puppies,
not from a `litter_id` on the invoice, because only 9 of 183 invoices carry one.

## Stage C — the female scorecard *(after B)*

One row per breeding female with lifetime contribution, per litter, per puppy reared. Sortable.
This is the screen that answers "which of my females actually makes money".

---

## Do not

- **Do not build on manual tagging alone.** That is the mistake this whole prompt exists to avoid.
  479 transactions in DogBreederPro, 2 tagged. 351 here, 1 tagged.
- Do not copy DogBreederPro's seven-field puppy record.
- Do not resurrect `litter_transactions`. It has 0 rows and duplicates `expenses` + `invoices`.
  **Say plainly in your report whether it should be dropped** — do not silently start writing to it.
- Do not hard-code any multiplier, amortisation period, or rate. Settings, with the defaults above.
- Do not show an allocated number without the working behind it.
- Do not create test expenses or invoices in production.

---

## Stage A report

1. Which table now holds the puppy outcome, and why.
2. The expense reclassification counts, before and after.
3. The dog-days function and its test.
4. A worked figure: what share of one month's Feed & Nutrition the Claire × Santini litter carries,
   with the arithmetic shown.
5. Your recommendation on `litter_transactions`.
6. `npx tsc --noEmit` clean in both repos.
