# Cursor Prompt — Ship the weight fixes and the finance work

Nothing in this prompt is live. The web repo has **72 uncommitted files** and HEAD is still
`af80de8`. Three migrations are written but **not applied**. The job is to get it out safely, in
the right order.

---

## STOP — read this before you push anything

**Migrations 0198, 0199 and 0200 are NOT applied to the live database.** I verified by querying
the live schema, not the filenames:

| Migration | Object checked | Present? |
|---|---|---|
| 0196 payment accounts | `invoice_payments.payment_account_id` | **yes** |
| 0197 interval weighing | `idx_weight_logs_dog_date_session` is partial | **yes** |
| 0198 waiting-list hold | `waiting_list.hold_set_by` | **NO** |
| 0199 invoice contact + gap reviews | `invoices.contact_id`, `invoice_payment_gap_reviews` | **NO** |
| 0200 litter txns + sale link | `sale_link_reviews` | **NO** |

Uncommitted code depends on all three — `confirm-buyers/`, `assign-accounts/`,
`unrecorded-payments/`, `sale-link-actions.ts`, `statement-actions.ts`, the allocation hold UI.

**Apply 0198, 0199, 0200 first. Then typecheck. Then commit. Then push.** Pushing first puts code
live that queries columns which do not exist — that is the failure this project has hit twice,
most recently when a column was dropped ahead of the code and new-litter creation broke.

---

## Order of operations

1. **Apply 0198, 0199, 0200** to the live database. Read back one object from each and paste the
   result. Do not trust the migration filenames.
2. **`npx tsc --noEmit` in both repos.** I could not complete this — the sandbox I work in
   degraded today and the same check that ran in three minutes now stalls past twenty. The unit
   tests pass and I checked every call site by hand, but **a green typecheck has not been seen.**
   Treat this as unverified and fix whatever it reports.
3. **`npm run parity`** in the root repo. It currently fails with 7 unrecorded screens — see
   `CURSOR_PROMPT_EXPENSE_SPLIT_AND_CI.md` Part 1a. Several new ones from this batch
   (`admin/finance/statements`, `litters`, `reconciliation`, `payments`) will add to that list.
   Record each with a reason; do not blanket-ignore.
4. **Review what is staged before committing.** `git status` shows 72 files across weight
   tracking, cash receipts, bank statements, litter reporting and buyer confirmation. Read the
   diff. This repo has twice come within one command of committing client personal data.
5. **Commit and push both repos.** The Expo app is the top-level repo; `diedericksdobermann-web`
   is a separate repo, gitignored by it. Both need pushing.
6. **Confirm the deploy served the new commit** — not that Vercel reported success. Load the
   litter page and check the change is actually there.

---

## What I changed, and what must not be undone

### The AM/PM save was broken by migration 0197 — my error

0197 made the AM/PM uniqueness index **partial** (`where session in ('AM','PM')`) so interval
schedules could record many readings a day. That is correct and stays. But Postgres will not use
a partial index for `ON CONFLICT (cols)` unless the statement repeats the index predicate, and
supabase-js cannot express that. Reproduced live:

```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

That is why saving an AM/PM round failed.

**Fix, already written:** `WeightLogWriter` no longer has `upsert`. It has `findExisting` (now
returning `id`), `update` and `insert`. AM/PM reads the row and updates it by id — no conflict
target needed. Interval readings always insert.

- `src/lib/litters/weightRounds.ts`
- `src/app/admin/(panel)/litters/[id]/actions.ts`

**Do not "fix" this by reverting 0197 to a full unique index.** That caps a puppy at three
readings a day and silently overwrites interval weights — the bug 0197 existed to fix.

### Columns sorted alphabetically, so evening came before morning

`roundKey` produced `2026-09-29#AM` and `2026-09-29#19h`. Sorted as text, `'1' < 'A'`, so the
**19:00 reading appeared to the left of the 08:00 one.** That is the "incorrect order" Matt
reported when not using AM/PM.

Keys now carry minutes-from-midnight — `2026-09-29#0480#AM`, `2026-09-29#1153#19h` — so columns
run in clock order. AM reads as 08:00 and PM as 18:00, matching what `weighingDue` already
assumes. `roundLabel` still prints the day first and no clock time for AM/PM/daily.

Covered by a new assertion in `weightRounds.test.ts`. Run it:
`npx tsx src/lib/litters/weightRounds.test.ts`

### Birth weights were being destroyed on entry — the real bug

Both repos wrote the birth weight as a `weight_logs` row with **`session: 'AM'` on the birth
date**. That is the same slot the first morning weigh-in claims, so **each puppy's first weighing
overwrote its own birth weight.** K1's 28 Sep AM row holds 522 g; her 490 g birth log is gone.
Across the entire database only **9** birth logs survived that collision.

**Fix:** birth weight is no longer written as a log at all. `dogs.birth_weight_grams` is its single
home, and `withBirthWeight()` in `src/lib/portal/puppyTracker.ts` prepends it to every chart.
Removed from all four registration paths:

- `src/app/admin/(panel)/litters/[id]/puppy-actions.ts`
- `src/app/admin/(panel)/litters/[id]/register-pups/actions.ts`
- `diedericks-dobermanns/lib/dogs/mutations.ts`
- `diedericks-dobermanns/app/(admin)/litters/[id]/register-pups.tsx`

`birthWeightLogInsert` and `shouldWriteBirthWeight` now have **no callers**. Leave them in
`newbornPuppy.ts` with their tests, or delete both plus their tests — do not delete the functions
and leave the tests importing them.

**Do not reinstate the birth weight log.** If you think a birth row belongs in `weight_logs`, it
needs its own session value and a migration to widen
`weight_logs_session_check` (currently `AM`, `PM`, `daily` only) — and that is a separate
decision, not a quiet re-add.

### The chart could not show a newborn's growth

`PuppyWeightChart` plotted kilograms on an axis anchored at zero, so 490 g → 572 g was a flat
line. It now plots **grams under 2 kg** and scales the axis to the readings. This component is
shared with the **client portal**, so buyers see it too; `birth_weight_grams` was added to the
portal dog query for the same reason.

---

## Already corrected in the live database — do not re-run

All backed up in `dbp_import.litter_data_fixes`.

- **Odessa × Santini litter.** The 29 Sep 19:13 and 30 Sep 07:35 rounds had been saved as
  `session='daily'` (because AM/PM could not save) and are relabelled **PM** and **AM** from their
  real `recorded_at`. Weights and timestamps untouched. Litter is back on `am_pm`.
  K1 now reads: **Birth 490 → 28 Sep AM 522 → 29 Sep AM 572 → 29 Sep PM 613 → 30 Sep AM 652.**
- **Waiting-list deposits.** 7 of 10 entries were wrong. `deposit_amount` was null on five;
  **Gabrielle Kruger** and **Leandre** were still at `quote_sent` despite R10 000 and **R37 500**
  received. All reconciled. The *cause* is still unfixed in code — see
  `CURSOR_PROMPT_EXPENSE_SPLIT_AND_CI.md` Part 3.
- **Felicia Nell's waiting-list entry** deleted (test data). Her application, quote and client
  account remain.

---

## Verification — do these on the live site, signed in, after deploying

1. Open the Odessa litter, set **AM / PM**, save a round. **It must save.** This is the headline
   fix and it is the one thing that is currently broken for Matt.
2. Re-save the same session with a different weight — it must **correct** that row, not add one.
3. Switch to **Every 12 hours** and save twice in a day — both readings must persist.
4. The weight grid reads **Birth · 28 Sep AM · 29 Sep AM · 29 Sep PM · 30 Sep AM**, in that order,
   with no clock times in the AM/PM headers.
5. Register a test puppy with a birth weight on a test litter, weigh it the same morning, and
   confirm the **birth weight still shows** afterwards. Delete the test puppy and prove it.
6. A puppy's own profile chart starts at its birth weight, in grams, on a scaled axis.

## Report

1. The three migrations applied, with one live object read back from each.
2. `npx tsc --noEmit` output for both repos.
3. `npm run parity` output and the exception entries added.
4. The commit list and both pushes.
5. The Vercel deploy serving the new commit — the commit SHA, not a green tick.
6. Screenshots for verification steps 1, 4 and 5.
