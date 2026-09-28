# Cursor Prompt — PM weights still lose five puppies out of six

## Do this first

1. Repo: `diedericksdobermann-web` (and the app repo if the grid exists there too).
2. `npx tsc --noEmit` when done. Paste the real output.

---

## What happened

Matt weighed the whole litter on the evening of 28 Sep and saved. **One puppy reached the database.
Five vanished with no error.**

Every row in `weight_logs` for that day, straight from the live database:

```
puppy  date        session  kg     recorded_at  saved (SAST)
K1     2026-09-28  AM       0.522  15:40:22     17:32:53
K2     2026-09-28  AM       0.628  15:40:22     17:34:02
K3     2026-09-28  AM       0.537  15:40:22     17:35:56
K4     2026-09-28  AM       0.615  15:40:22     17:36:40
K5     2026-09-28  AM       0.457  15:40:22     17:36:57
K6     2026-09-28  AM       0.469  15:40:22     17:37:15
K5     2026-09-28  PM       0.457  16:54:36     18:54:37
```

The AM round saved cleanly — six puppies, one a minute. The PM round produced **one row**.

The earlier fix worked: `session = 'PM'` is now reachable, and that was the first PM row in 1,241
records. But the fix went in for a single row, not for a round.

## The most likely cause, and how to confirm it before changing anything

`idx_weight_logs_dog_date_session` is unique on `(dog_id, recorded_date, session)`.

Every one of those six puppies already had an **AM** row for 28 Sep. So if the grid sends `session`
as `AM` for the rows after the first — because the session selector resets between saves, or is read
from component state that reverts, or defaults on re-render — then five inserts collide with rows that
already exist, the database rejects them, and **nothing is shown to the user.**

That fits the evidence exactly: one row got through with the correct session, the rest hit an index
that already had their AM entry.

**Confirm it first.** Put a PM round through six puppies with the network tab open and look at the
`session` value actually sent for rows two through six. Do not start changing code until you have
seen it. If the payload is correct and the rows still vanish, the cause is elsewhere and I want to
know what it is.

Second candidate, if the payload is right: the grid saves on blur and only the focused cell fires, so
typing six values and pressing Save commits one.

---

## Task

### 1. A round saves as a round

Saving a weigh-in round writes **every changed row in one request**, not one per cell. Report
`6 of 6 saved` on success and name the failures on partial success:

> *Saved 4 of 6. K3 and K5 failed: duplicate entry for PM on 28 Sep.*

### 2. No write on this screen may fail silently — ever

This is the third time a save on this project has failed without saying so: Felicia's expenses in
September, the PM weight last week, and now five puppies.

Every rejected row surfaces its reason on the row. **A 2 a.m. weigh-in on a fading puppy is the exact
case this screen exists for**, and a silent failure there is the most expensive bug in the system.

### 3. Re-weighing the same session updates, it does not fail

If Matt weighs K3 at PM and then weighs her again because the first reading looked wrong, that must
**update** the existing PM row, not throw a duplicate-key error.

Make it an explicit upsert on `(dog_id, recorded_date, session)` with the new weight and
`recorded_at`, and tell him it replaced a reading:

> *K3 PM updated from 0.537 to 0.541 kg.*

### 4. `recorded_at` is the time of the weighing, not the batch

All six AM rows carry `recorded_at = 15:40:22.326` — identical to the millisecond. That is when the
form was opened, not when each puppy was weighed.

It does not matter for a twice-daily grid. It makes hourly weighing meaningless, which is the next
thing being built. Stamp each row when its weight is entered.

### 5. Prove it with all six

The previous fix was verified with one row and shipped. Verify this one by weighing **all six puppies
at PM** and showing six rows in `weight_logs`.

---

## Do not

- Do not remove the unique index to make the error go away. Re-weighing must update, not duplicate.
- Do not swallow a database error anywhere on this screen.
- Do not change anything before you have seen what the payload actually sends.
- Do not create test weight rows against Matt's live puppies. Use a scratch dog and delete it, or a
  local database.

---

## Report

1. The `session` value sent for rows two through six, from the network tab. The cause, in one
   sentence.
2. Six PM rows in `weight_logs` for one litter, from a real save.
3. What Matt sees when one row of six fails.
4. A re-weigh updating an existing row, with the message.
5. `recorded_at` differing per puppy within one round.
6. `npx tsc --noEmit` clean.
