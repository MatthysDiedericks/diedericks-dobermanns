# Cursor Prompt — Warn before deleting a litter, and capture a puppy properly when it is born

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Every column needed already exists on `dogs`. Verified 15 Sep 2026.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

**Two `status: "puppy"` bugs were fixed by hand on 15 Sep 2026** in
`litters/[id]/puppy-actions.ts:83` and `litters/[id]/register-pups/actions.ts:82`. `puppy` is a
*category*, not a status, and `dogs_status_check` rejects it — every Add Puppy was failing with
*"new row for relation dogs violates check constraint dogs_status_check"*. They now write
`status: "available"`. **Do not revert those.** There is a matching dead assertion at
`src/lib/litters/derivedCounts.test.ts:30` — `puppyCountsAsAvailable({ status: "puppy" })` — which
tests a value no dog can hold. Delete that line.

---

## Task 1 — Ask before deleting a litter, and say what will be lost

Today the Delete button on the litter Overview tab deletes immediately. That is dangerous, and
more dangerous than it looks, because the damage is not confined to the litter row.

**These are destroyed permanently by the database when a litter is deleted (`ON DELETE CASCADE`):**

| Table | What it is |
|---|---|
| `puppy_health_records` | **every health record for the litter** |
| `litter_media` | **every photo of the litter** |
| `litter_transactions` | **the litter's finances** |
| `litter_todos`, `todo_items` | the litter's task lists |

**These survive but are silently cut loose (`ON DELETE SET NULL`):** `dogs.litter_id` — so **the
puppies remain but stop being littermates**, and the sire/dam link through the litter is gone —
plus `invoices`, `expenses`, `contracts`, `reservations`, `applications`, `waiting_list`,
`heat_cycles`, `quote_items`, `client_groups`, `pairings`, `breeding_plan_steps` and
`calendar_events`.

So a stray click on a real litter destroys health history and photographs, breaks the pedigree for
every puppy in it, and leaves invoices pointing at nothing. None of that is recoverable from the
app.

**Build a confirmation that counts the real rows before asking.** Not a generic "are you sure" —
those get clicked through. Query the actual counts and show them:

```
Delete “Claire × Santini – Jul 2026”?

This permanently deletes:
  • 24 health records
  • 18 photos
  • 6 financial entries

And disconnects:
  • 10 puppies — they will remain as dogs but lose their litter and their littermates
  • 3 invoices, 1 contract, 2 waiting list entries

This cannot be undone.
```

Only show the lines that have a non-zero count. Require the person to type the litter's name — or
at minimum click a second, clearly-worded confirm — before the delete runs. The keystroke is worth
it; this is the most destructive button in the admin.

**If the litter has puppies, do not offer plain deletion at all.** Offer **Archive** instead — set
`status` to something inactive and hide it from the working lists. A litter that produced dogs is
history, and history is what Matt sells: the pedigrees, the health record, the line. Deletion
should be for a litter created by mistake, with nothing hanging off it.

Same confirmation on the app.

## Task 2 — Capture the puppy properly at birth

The Add Puppy row on the litter Puppies tab currently takes **sex** and **collar** only. When a
whelping is in progress that is not enough, and going back later to fill in birth weights from
memory is how the data ends up wrong.

Add to that row, all of which already exist as columns on `dogs`:

| Field | Column | Notes |
|---|---|---|
| **Birth weight** | `birth_weight_grams` (integer) | in **grams** — label it so, because 450 and 0.45 are both plausible entries and only one is right |
| **Time of birth** | `birth_time` (time) | default to the current time, since it is normally entered as the pup arrives |
| **Colour** | `colour` (text) | `black_tan` / `brown_tan` — use `DOG_COLOUR_OPTIONS`, do not hand-roll the list |
| **Collar colour** | `collar_colour` (text) | already present, keep it |

Keep the row on one line where the width allows, and let it wrap on a narrow screen. **The whole
point is that it can be filled in quickly, one puppy at a time, with wet hands at three in the
morning** — so keep the tab order sensible, keep focus in the row after saving, and increment
**Next #** automatically so the next puppy can be entered without touching the mouse.

**When a birth weight is entered, also write the `weight_logs` row** — the full Register Pups flow
already does this at `register-pups/actions.ts:91`, and the growth chart depends on it. A puppy
added one at a time should not end up with a birth weight that the chart cannot see.

Keep **Register Pups** as it is for entering a whole litter at once. The two paths must produce
identical rows — same fields, same `weight_logs` entry, same status. If they drift, the growth
chart works for one and not the other.

## Task 3 — App parity

Both changes on the app too: the confirmation with real counts, and the fuller puppy row. The
website is the reference implementation.

---

## Do not

- Do not add a migration. `birth_time`, `birth_weight_grams`, `colour`, `collar_colour` and
  `birth_order` all already exist on `dogs`.
- Do not change any `ON DELETE` rule. The cascades are doing what they should; the missing piece is
  telling the person what is about to happen.
- Do not write `status: "puppy"` anywhere. See the note at the top.
- Do not make birth weight or time mandatory. A pup sometimes arrives while Matt's hands are full,
  and a form that refuses to save loses the record entirely.
- Do not delete anything in production while testing.

---

## Report

1. Screenshot of the delete confirmation on **Claire × Santini – Jul 2026**
   (`11111111-1111-4111-8111-111111111001`) — it has 10 puppies, so it should offer Archive rather
   than delete, with real counts. **Do not actually delete it.**
2. Screenshot of the confirmation on a litter with nothing attached, where plain delete is correct.
3. Screenshot of the new Add Puppy row with all six fields.
4. Proof that adding a puppy with a birth weight creates the matching `weight_logs` row — paste
   the query and the result.
5. Confirmation that a puppy added one at a time and one added via Register Pups produce the same
   columns.
6. The same on the app.
7. `npx tsc --noEmit` clean in both repos.
