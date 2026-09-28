# Cursor Prompt — Guide the whelping: plan it, record each pup as it arrives, then weigh

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Every column exists: `dogs.birth_time`, `birth_weight_grams`, `colour`,
   `collar_colour`, `birth_order`, and `weight_logs`.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

**Already built, do not rebuild:** `lib/litters/outcomes.ts` and `lib/litters/newbornPuppy.ts`
handle live / stillborn / died-early correctly, reusing `status: "deceased"` rather than adding a
new status value. Use them. Two `status: "puppy"` bugs were fixed by hand in
`puppy-actions.ts` and `register-pups/actions.ts` — do not reintroduce them.

---

## The problem with the screen today

The litter page shows eleven tabs of equal weight — Overview, Puppies, Weights, Media, Documents,
To-Do, Financials, Fulfilment, Contracts — from the day the litter is created until years after the
last pup goes home. Nothing tells Matt what to do next.

But a litter is not a static record. **It is a process with three distinct phases**, and in each
phase there is exactly one thing that matters:

| Phase | The only job that matters | Where Matt is |
|---|---|---|
| **Planned / Expected** | get the pairing and dates right | at a desk |
| **Whelping** (hours) | record each pup as it is born | on the floor, on a phone, one hand free |
| **Rearing** (8 weeks) | weigh them, every day at first | in the kennel, twice a day |

Build the page around that. Same tabs underneath, but the litter's status decides what the screen
puts in front of him.

## Step 1 — Planned: get the litter right

Covered by `CURSOR_PROMPT_ADD_LITTER_FORM.md` — run that first if it has not been done. Sire and
dam scoped to living breeding dogs, dates tied to status, auto-generated name, no double submit.

When status is `planned` or `expected`, the page leads with what is still missing: expected date,
litter letter, and a **"Start whelping"** button that is the obvious next action.

## Step 2 — Whelping mode: one pup at a time

"Start whelping" sets the litter to `born`, stamps `actual_date`, and opens a screen built for a
person kneeling next to a whelping box at two in the morning.

**One pup at a time, in this order**, because that is the order the information arrives:

```
   Pup #4                          ← auto, no typing

   ○ Live   ○ Stillborn   ○ Died shortly after      ← first, because it changes everything below

   Time      02:14        ← pre-filled to now, tap to adjust
   Sex       ♂  ♀         ← two big buttons, not a dropdown
   Weight    ____ g       ← numeric keypad, grams
   Collar    ● ● ● ● ●    ← colour swatches, tap one
   Colour    Black & Tan / Brown & Tan

   [ Add photo ]  (optional)

   [  SAVE PUP #4  ]
```

**Rules that make it usable with one hand:**

- **Big targets.** Sex, collar and outcome are taps, never dropdowns.
- **Time defaults to now** and is almost always right.
- **Weight in grams**, numeric keypad, no decimal — 450 not 0.45.
- **Save never blocks on a photo.** If the upload fails, the pup is still saved and the photo can
  be added later. A lost weight because the camera was slow is unacceptable.
- **After saving, stay in the flow**: the number increments, the form clears, focus returns. Matt
  should be able to record eight pups without leaving the screen.
- **A running list above the form** — "3 born · 2 live, 1 stillborn · last at 01:58" — so he can
  see what is recorded without scrolling. This is also the answer to "did I already add that one?"
  at four in the morning.
- **Never lose an entry.** If the save fails, keep the values on screen with a clear retry. Do not
  clear the form on error.

**Each saved pup writes both** the `dogs` row (via `newbornPuppyInsert`) **and** the `weight_logs`
birth row, so the growth chart has a starting point. This is the bug in the current one-at-a-time
path — `register-pups` writes the weight log, the single Add Puppy does not.

**"Finish whelping"** closes the mode, sets `puppy_count`, and moves the page to rearing.

## Step 3 — Rearing: weighing is the job

Once the litter is `born` and has pups, the page should lead with weights.

**One screen, every pup listed, one weight each, one save.** Not a form per puppy:

```
  Weigh-in    Thu 17 Sep    ○ AM  ● PM

  A1 Pink     450 g → [ 512 ]      ▲ +62
  A2 Red      480 g → [ 545 ]      ▲ +65
  A3 Gold     410 g → [ 402 ]      ▼ −8   ⚠
  ...
                                   [ SAVE ALL ]
```

- Previous weight shown, so the change is visible as it is typed.
- **Flag a pup that has lost weight or gained nothing** since the last weigh-in. In the first two
  weeks that is the single most important signal in the whelping box, and it is the reason to
  weigh daily at all.
- Default to the session not yet recorded today (AM before noon, PM after).
- Keep the existing growth benchmark chart — link to it, do not duplicate it.

**On the app this must work on a phone held in one hand.** That is where it will actually be used.

## Step 4 — Make the next step obvious everywhere

On the litters list and the litter page, show the phase and the next action, not just a status
chip: *"Born 3 days ago · 8 pups · not weighed today"*. A litter that has not been weighed today
should be visible from the list without opening it.

---

## Do not

- Do not add a migration.
- Do not rebuild `outcomes.ts` or `newbornPuppy.ts`.
- Do not require a photo, a colour, or a weight to save a pup. Missing data is recoverable; a pup
  that was never recorded because the form refused to save is not.
- Do not remove Register Pups — it is the right tool for entering a past litter in one go. The two
  paths must write identical rows, including the `weight_logs` entry.
- Do not create test litters or puppies in production. Use a preview environment.

---

## Report — and this is the part to take seriously

Do not report that this works. **Show it working**, on a preview environment:

1. A short screen recording, or a sequence of screenshots, of **recording four pups end to end**
   without leaving the whelping screen — including one stillborn.
2. The four resulting `dogs` rows and the four `weight_logs` rows, as a query result. Prove the
   birth weight reached the weight log.
3. The same four pups entered through Register Pups, and a diff showing the columns are identical.
4. A weigh-in saving eight pups in one action, with the loss flag firing on a pup that dropped.
5. The whelping screen at 375px wide, which is the width it will be used at.
6. A save that fails — network off — showing the values are still on screen and retryable.
7. `npx tsc --noEmit` clean in both repos.

**If any of the seven cannot be shown, say which and why** rather than reporting the task complete.
