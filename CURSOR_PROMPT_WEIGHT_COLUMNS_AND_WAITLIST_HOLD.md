# Cursor Prompt — Weight columns, interval weighing, and the waiting-list hold note

Two jobs. Part A is already written on disk in the **web** repo and needs mirroring into the
**Expo** repo, then committing. Part B is new work.

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns` (the Expo app).
2. `npx tsc --noEmit` in both when done, and `npm run parity` in the web repo.
3. Paste the real output. Do not summarise it.

---

## Migrations — already applied, do not re-apply

`0195_weight_recorded_at_and_schedule.sql` and `0197_interval_weighing_and_12h.sql` are **live in
the database already**. 0197 is committed to the repo; confirm 0195 is too. Verify both by reading
the live objects, not the filenames:

```sql
select indexname, indexdef from pg_indexes
where schemaname='public' and tablename='weight_logs';
```

You must see `idx_weight_logs_dog_date_session` **with a WHERE clause** on `session IN ('AM','PM')`,
and `idx_weight_logs_dog_recorded_at` without one. If the first one has no WHERE clause, stop and say
so — 0197 did not take.

---

# Part A — Weight columns (already written in web, mirror to Expo)

## The bug, so you do not undo it

`roundKey()` built each grid column from `recorded_at`, sliced to the minute. `recorded_at` is **when
the number was typed**. `recorded_date` is **the day the puppy stood on the scale**. Those differ
whenever a round is written up later.

On 29 Sep 2026 the Odessa litter's 28 Sep round was entered at 07:51 and the 29 Sep round at 07:52.
Both columns came out labelled "29 Sept", and one of them was actually the 28th. Worse, because each
puppy's weight is typed a few seconds apart, a round that straddled a minute boundary split into two
columns with half the litter showing "missed" in each.

**A round is a day plus a slot. It is never a timestamp.**

## Already changed in `diedericksdobermann-web` — read these before touching anything

- `src/lib/litters/weightRounds.ts` — `roundKey` keys on `recorded_date` + slot; `roundLabel`
  renders the day first and no clock time for AM/PM/daily; new `BIRTH_ROUND_KEY`; `every_12h` added
  to `WeighingSchedule` and `WEIGHING_SCHEDULES`.
- `src/components/litters/LitterWeightGrid.tsx` — Birth is a real first column, drawn from
  `dogs.birth_weight_grams`. A pup with no birth weight shows `—`, **not** "missed" — a birth weight
  nobody wrote down is not a round that can be gone back and weighed.
- `src/components/litters/LitterGrowthChart.tsx` — birth weight is the first point on every line,
  prepended from `birth_weight_grams` + `birth_time`; day gridlines and day labels on the x axis;
  min/max grams labelled.
- `src/app/admin/(panel)/litters/[id]/actions.ts` — the upsert conflict target is now chosen by
  slot. See below; this one matters most.
- `src/lib/litters/weightRounds.test.ts` — new `columnsAreDaysNotTypingTimes()` case covering the
  28-typed-on-29 scenario. Run it: `npx tsx src/lib/litters/weightRounds.test.ts`.

## The upsert rule — do not simplify this back

```ts
const slotted = row.session === "AM" || row.session === "PM";
onConflict: slotted ? "dog_id,recorded_date,session" : "dog_id,recorded_at"
```

AM and PM are slots, so re-weighing one must **correct** that row. An interval reading is a moment in
time and there are many a day, so upserting it on `(dog, date, session)` matched the reading taken an
hour earlier and **silently overwrote it**. Six hourly weights became one. That is the same shape as
the reported "PM round loses rows", and it is why the old unique index had to become partial.

`findExisting` now returns `null` for any non-AM/PM session, because there is no prior row to find.

## Your job in Part A

1. **Mirror all of it into `diedericks-dobermanns`.** `lib/litters/weightRounds.ts` there is a
   byte-for-byte copy of the web file and still has the old `roundKey`. `npm run parity` will fail
   until they match. Also update `lib/litters/weightRounds.test.ts` and the schedule parser at
   `app/(admin)/litters/[id]/index.tsx:137`, which whitelists schedule ids and will silently reject
   `every_12h`.
2. Find every other place either repo groups or labels weight readings and make sure it goes through
   `roundKey`/`roundLabel` rather than formatting `recorded_at` itself.
3. Commit and push both repos.

## Do not

- Do not re-add a blanket unique index on `(dog_id, recorded_date, session)`.
- Do not change `recorded_at` to mean the weighing day. It is the typing time and other code depends
  on that — `weighingDue` uses it to work out how long since the last round.
- Do not put clock times in AM/PM or daily column labels. Matt was explicit: the day only.
- Do not touch the Odessa litter's data. It was corrected on 29 Sep and backed up to
  `dbp_import.litter_data_fixes`.

## Known gap, leave it or say so

On an interval schedule, saving the same round twice creates two rows, because each save stamps a new
`recorded_at` and nothing catches it. Low risk, not fixed. If you fix it, a per-round idempotency key
is the way, not a broader unique index.

---

# Part B — Show the waiting-list hold note during matching

## Why

Alyssa Buxmann has paid a deposit and asked to take a puppy **at a later stage**, not from the current
litter. That is recorded on her waiting-list row:

```
waiting_list.id   d3bab29b-f726-4124-9d10-121a7bad56b8
hold_reason       'Asked to take a puppy at a later stage, not from the current litter...'
hold_until        2026-12-29
follow_up_date    2026-12-01
pipeline_stage    deposit_paid   (unchanged — her claim and queue position stand)
```

**`waiting_list.hold_reason` and `waiting_list.hold_until` are currently read nowhere in either
repo.** Confirm that yourself with a grep before you start. The quote-level
`quotes.lapse_hold_until` / `lapse_hold_reason` pair is a *different* feature — do not reuse its
components or conflate the two.

So the note exists and is invisible. Matt's requirement, in his words: *"I want to see the note when
doing the matching."*

## What to build

**Show, do not hide.** A held client must still appear in match and allocation results, with the hold
displayed. Filtering her out silently is wrong: Matt needs to see that she is there and being skipped
on purpose, otherwise a paid deposit quietly vanishes from the queue and nobody notices for months.

1. **A hold badge on the row**, wherever a waiting-list entry is shown in a matching or allocation
   context:
   - `src/app/admin/(panel)/waitlist/match/page.tsx`
   - `src/app/admin/(panel)/litters/[id]/allocate/page.tsx`
   - `src/components/litters/LitterAllocateBoard.tsx`
   - `src/app/admin/(panel)/waitlist/page.tsx`

   Badge reads `On hold until 29 Dec 2026` with the reason text visible — on the row or one tap away,
   not behind a tooltip only. Amber, consistent with the existing concern styling.

2. **Ranking**: a held entry sorts **below** unheld ones of the same stage, and keeps its real queue
   position displayed. It does not lose its place — it is deprioritised for *this* allocation only.

3. **A confirm step, not a block**: if Matt allocates a puppy to a held client anyway, show the hold
   reason and ask him to confirm. He is allowed to override — she may well phone tomorrow and change
   her mind. Never hard-block.

4. **Setting and clearing a hold from the UI.** Right now the only way to set one is raw SQL, which
   is how this note came to exist. A small card on the waiting-list entry: reason (required, min 3
   chars, mirror the validation in `quoteLifecycleActions.ts:88`), `hold_until` date, and a Clear
   action. Record who set it and when — add `hold_set_by uuid references auth.users(id)` and
   `hold_set_at timestamptz` in a new migration if they do not exist, ending with
   `notify pgrst, 'reload schema';`.

5. **An expired hold is not a hold.** Once `hold_until` is in the past, the entry ranks normally
   again, but show a `Hold expired 29 Dec` chip so Matt knows to follow up rather than assuming she
   is still waiting quietly. Follow the existing `isQuoteOnHold` / `holdChipLabel` helper pattern in
   `src/lib/finance/` — write the waiting-list equivalents as pure functions with unit tests.

6. **Mirror to the Expo app** if it has a matching or allocation screen. Check before assuming.

## Tests

- A held entry appears in match results with the hold visible, ranked below unheld peers of the same
  stage, with its true queue position shown.
- Allocating to a held entry surfaces the reason and requires confirmation; confirming succeeds.
- A hold with `hold_until` in the past ranks normally and shows the expired chip.
- Setting a hold with a blank or 2-character reason is rejected.
- Clearing a hold nulls `hold_reason`, `hold_until`, `hold_set_by`, `hold_set_at` together.
- Alyssa's real row renders correctly on the Odessa × Santini allocate page.

## Do not

- Do not filter held entries out of matching.
- Do not hard-block allocation to a held client.
- Do not change her `pipeline_stage` or `payment_status` — the deposit is paid and stays paid.
- Do not reuse the `quotes.lapse_hold_*` columns or components.
- Do not create test waiting-list rows in production. Use a local branch or clean up and prove it.

---

## Report

1. `pg_indexes` output for `weight_logs`, showing the partial index.
2. The Odessa litter grid: Birth as the first column, then `28 Sep AM`, then `29 Sep AM`. Screenshot.
3. The growth chart starting at birth weight, with day labels.
4. A litter set to `Every 12 hours`, with three readings on one day all stored — proof the old cap is
   gone. Do this on a test litter, not Odessa.
5. `npm run parity` clean.
6. Alyssa's row in the Odessa allocate screen with the hold badge and reason. Screenshot.
7. The override confirm dialog.
8. `npx tsc --noEmit` clean in both repos, and both test scripts passing.
