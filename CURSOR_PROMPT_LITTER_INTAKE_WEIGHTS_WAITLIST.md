# Cursor Prompt — Puppy intake, weighing that actually saves, and the waiting list on the litter

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.
3. Five parts. **Part 2 is a live bug and comes first** — Matt cannot record an evening weight today.

---

## Part 1 — A puppy cannot be saved half-entered

Adding a litter works. Adding the puppies is where records go thin, and a puppy entered without its
collar colour is a puppy nobody can identify in the whelping box an hour later.

These fields already exist on `dogs` and are the ones that matter at birth:

```
birth_order            birth_time        birth_weight_grams
collar_colour          sex               birth_type
```

**Required before a newborn puppy can be saved**, on the register-pups screen and anywhere else a pup
is created from a litter:

- **Sex** — everything downstream keys off it
- **Collar colour** — the only way to tell them apart before microchips
- **Birth weight** — no baseline means the growth chart is meaningless
- **Birth time** — birth order and timing are the whelping record

Optional but prompted: birth order (default to the next number in sequence), birth type (natural /
assisted / caesarean), colour, markings.

Rules:

- **Validate per puppy, not per form.** Matt adds them one at a time as they arrive, sometimes at
  03:00. Puppy 4 being incomplete must not block saving puppy 3.
- **Never block on a field he cannot know yet.** Colour on a wet newborn is a guess; do not require it.
- Inline errors on the field, not a summary at the top.
- **Collar colour must be unique within the litter** — two green collars defeats the purpose. Warn on
  a duplicate and let him override, because he may genuinely have run out.
- Say what saved: *"Puppy 4 of 8 saved — green collar, male, 420 g, 02:14"*. Matt reported in
  September that a save looked like it had failed when it had worked; every save on this screen
  confirms with the specifics.

---

## Part 2 — The evening weigh-in has never once saved

This is a real bug and here is the evidence, counted live on 28 Sep 2026:

```
weight_logs rows                 1,240
session values ever written      AM, daily
session = 'PM' rows              0
rows written today (28 Sep)      5, all AM
```

The database is not the problem. The check constraint allows `'AM'`, `'PM'` and `'daily'`, and the
unique index is on `(dog_id, recorded_date, session)`, so an AM and a PM row for the same puppy on the
same day are perfectly legal.

**In 1,240 weight records there has never been a single PM row.** AM saved fine five times this
morning. So the PM path in the UI either never sends `session = 'PM'`, or sends AM/null, collides with
the morning row on that unique index, and the error is swallowed — which is exactly the pattern
behind the expense-save complaint in September: the write failed and the screen said nothing.

**Find it, fix it, and prove it** with a PM row in `weight_logs` for a real puppy.

**Every failed write on this screen must show the reason.** A silent failure at a 2 a.m. weigh-in is
how a fading puppy gets missed.

### Then: weighing more often than twice a day

Matt needs hourly, 2-hourly, 4-hourly and 6-hourly weighing for a litter at risk — a fading puppy is
caught by a weight that stops climbing, and twice a day is too coarse to see it.

**The unique index is the blocker.** `(dog_id, recorded_date, session)` cannot hold twelve readings in
one day. `weight_logs.recorded_at` (timestamptz) already exists and is the right key.

Migration, both repos, ending `notify pgrst, 'reload schema';`:

- Backfill `recorded_at` where it is null, from `recorded_date` plus a sensible hour for AM/PM/daily
- Replace the unique index with one on `(dog_id, recorded_at)`
- Widen the `session` constraint to include the intervals, or — better — keep `session` for the
  AM/PM/daily label and let `recorded_at` carry the truth. **Say which you chose and why.**

On the litter, a **weighing schedule**: `am_pm` (default), `every_1h`, `every_2h`, `every_4h`,
`every_6h`, `daily`. Switching to an interval schedule shows the next due time and how long since the
last round. Switching back to `am_pm` is one tap — a crisis lasts two days, not three weeks.

**Do not build automatic reminders in this pass.** Show what is due; do not start sending alerts.

---

## Part 3 — Weights are the litter page for the first three weeks

For the first 21 days after `actual_date`, the weight chart and the weigh-in grid are **the main
element of the litter page** — above the puppy list, above everything. That is the window where a
puppy fades, and it is the only thing Matt needs to see at a glance.

- Chart: one line per puppy, colour-matched to its collar colour. A line going flat or down is the
  whole point — make it obvious.
- Beneath it, the grid: puppies down the side, weigh-in rounds across, so a missed round is visible.
- Flag any puppy that has **not gained since its last weighing**, and any below its birth weight after
  48 hours.
- **On day 22 the page returns to its normal layout** by itself, with weights back to a tab. No
  setting, no switch — the risk window closes on its own.
- A litter with no `actual_date` (planned or expected) never shows this.

---

## Part 4 — From the collar straight to the puppy's file

In the whelping grid and the puppy list, the **collar colour swatch and the puppy's name are both
links to that puppy's full profile** — pedigree, health, weights, photos, documents.

`CollarSwatch.tsx` already exists; make it the link. The whole row should be clickable, not a small
chevron at the end.

Matt is identifying a puppy by its collar in the box and wants its file immediately. Two taps from
"the green one" to its pedigree.

Open in the same tab with a working back button to the litter — not a new tab.

---

## Part 5 — The waiting list, on the litter

Two lists, both on the litter page, because Matt cannot answer "who gets this litter" without them.

Live counts, 28 Sep 2026:

```
waiting_list entries                  20
assigned to a specific litter          4
general queue, no litter assigned     16
longest wait                         116 days
stages in use   approved, deposit_paid, quote_sent, reserved
```

**a. Allocated to this litter** — the 4. Name, stage, preferences (sex, colour, ears, tail), deposit
status, and which puppy they are matched to if any.

**b. Waiting for a litter to be born** — the 16, with **how many days each has been waiting**, longest
first. That number is the point of the list: someone at 116 days needs a call, not a place in a
queue.

Show the wait as days, and quietly flag anything past 90 days. Each row links to the waiting-list
entry, and has an action to allocate them to a puppy in this litter.

Order by `queue_anchor_at` where it is set, otherwise `date_added` — and say in the code which you
used and why, because the two can disagree.

---

## Tests

- A puppy with no collar colour cannot be saved; one with all four required fields can
- Puppy 4 being incomplete does not block saving puppy 3
- A duplicate collar colour in one litter warns and can be overridden
- **A PM weight saves and appears** — the test that matters
- Twelve weights on one puppy in one day all save under a 2-hourly schedule
- A failed weight write shows the reason on screen
- A litter 10 days old shows the chart first; one 22 days old does not
- A puppy that has not gained since the last round is flagged
- The collar swatch links to the puppy profile
- The general queue is sorted by longest wait and shows correct day counts

---

## Do not

- Do not require fields Matt cannot know at birth.
- Do not let a save fail silently anywhere on these screens.
- Do not keep the unique index on `(dog_id, recorded_date, session)` — interval weighing cannot work
  with it.
- Do not build reminder notifications for weighing in this pass.
- Do not make the three-week switch a manual setting.
- Do not create test litters, puppies or weights in production.

---

## Report

1. The cause of the PM bug, in one sentence, and a real PM row in `weight_logs` proving the fix.
2. The migration, with the new index read back from the live database, and your decision on `session`
   versus `recorded_at`.
3. The intake screen rejecting an incomplete puppy and confirming a complete one with its specifics.
4. A litter inside 21 days and one past it, side by side.
5. The two waiting lists with real day counts, longest first.
6. `npx tsc --noEmit` clean in both repos.
