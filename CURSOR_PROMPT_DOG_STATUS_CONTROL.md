# Cursor Prompt — One status list, correct everywhere, reachable from the dog profile

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`. Both are wrong, in different ways.
3. **No migration.** The database is already correct; the two apps disagree with it.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What is actually broken

`public.dogs.status` has a check constraint. These ten values, and only these, are legal:

```
available · reserved · sold · donated · gifted · keep · in_training · deceased · stud · retired
```

Neither app matches it.

**Website — `src/components/admin/DogForm.tsx`, around line 116:**

```tsx
<option value="available">Available</option>
<option value="reserved">Reserved</option>
<option value="sold">Sold</option>
<option value="in_training">In Training</option>
<option value="not_available">Not Available</option>   // ← not a legal value
```

`not_available` is not in the constraint. **Choosing it makes the save fail with a database
error**, and the four statuses Matt uses most for older dogs — `deceased`, `stud`, `retired`,
`keep` — cannot be set from the website at all. There are 30 deceased dogs, 3 studs and 8
keepers in the database right now that no one can reach through this form.

**App — `components/forms/DogForm.tsx`, around line 35 and line 212:**

The zod schema allows `breeding_stock` and `puppy`; the picker offers `puppy`. None of the
three is a legal status. `puppy` is a *category*, not a status — the two got mixed up.

So each app offers at least one option that the database will reject, and the two apps offer
different lists from each other. That breaks the standing rule that website and app carry the
same functions.

---

## Task 1 — One list, in one file, in each repo

Create a shared constant so the list can never drift from the constraint again:

- Website: `src/lib/dogs/status.ts`
- App: `lib/dogs/status.ts`

```ts
/**
 * The ten values public.dogs.status accepts. This list mirrors the database
 * check constraint dogs_status_check — if you add a status here you must add
 * it to the constraint in the same change, or every save of that value fails.
 */
export const DOG_STATUSES = [
  { value: "available",   label: "For sale" },
  { value: "reserved",    label: "Reserved" },
  { value: "sold",        label: "Sold" },
  { value: "in_training", label: "In training" },
  { value: "keep",        label: "Kept — breeding" },
  { value: "stud",        label: "Stud" },
  { value: "retired",     label: "Retired" },
  { value: "deceased",    label: "Deceased" },
  { value: "donated",     label: "Donated" },
  { value: "gifted",      label: "Gifted" },
] as const;

export type DogStatus = (typeof DOG_STATUSES)[number]["value"];
```

**On the labels:** Matt says "for sale", so `available` reads **For sale**. The app currently
labels `sold` as "Alumni / Placed" and `deceased` as "In Memory" — that is public-facing
language and it is good, but it belongs in the *badge*, not the admin picker. In the picker,
say the plain thing so the person changing it knows exactly what they are setting. Keep
`DogStatusBadge.tsx` exactly as it is.

Both repos get the same file. Website is the reference; copy it across.

## Task 2 — Point every status control at that list

- Website `DogForm.tsx`: replace the hard-coded `<option>` block with a map over `DOG_STATUSES`.
- App `components/forms/DogForm.tsx`: replace both the zod enum and the `options` array.
  The zod enum should be derived from the constant, not retyped:
  `z.enum(DOG_STATUSES.map(s => s.value) as [DogStatus, ...DogStatus[]])`
- Grep both repos for any other place a status list is written out by hand and point it at
  the constant too. Report every location you find.

## Task 3 — Put it on the profile, not three clicks in

Matt's words: *"on each dog we can move them on their profiles"*. Today the only way to change
a status on the website is to open the dog, find the **Details** tab, scroll to the Status
field inside the full edit form, change it, and save the whole form. That is why it does not
feel like it exists.

Add a **status control in the dog's header block**, beside the name and the badge — the area
that already shows `Hunter-King / Hillo Betelges / 6 years 9 months · 26 Nov 2019 · Brown & Tan`.
A single select, or a badge that becomes a select when clicked. Changing it saves immediately
and shows a short confirmation. It must not require the full edit form to be submitted.

Same on the app, in the dog profile header.

## Task 4 — Two side effects, because a status is not just a label

- Setting **`deceased`** should stamp `deceased_at` with today's date if it is empty, and
  should leave `is_public` alone — Matt may well want a memorial page.
- Setting **`sold`** on a dog with no `new_owner_name` and no `buyer_contact_id` should warn:
  *"No buyer recorded for this dog."* — with a link to the Ownership card. Warn, do not block;
  there are 20 sold dogs in this state already and Matt may be recording history.

Nothing else should change automatically. In particular **do not touch `is_public`** on any
other status change — that decides what the public website shows, and it is Matt's call.

## Task 5 — A guard so this cannot rot

Add a test in the website repo that reads the ten values from `DOG_STATUSES` and asserts the
set is exactly:

```
available, reserved, sold, donated, gifted, keep, in_training, deceased, stud, retired
```

A plain equality assertion on the sorted list is enough. The point is that when someone adds
a status to the picker without adding it to the database, the test fails loudly instead of the
save failing quietly in front of a client.

---

## Do not

- Do not add a migration. The constraint is right; the apps are wrong.
- Do not change `DogStatusBadge.tsx` or any public-facing wording.
- Do not change any dog's status as part of this work. Display and controls only.
- Do not add `puppy`, `breeding_stock` or `not_available` back in any form. `puppy` and
  `breeding_stock` are values of `category`, which is a different field.
- Do not create test dogs in production to try this out. Use a local or preview environment.

---

## Report

1. The path of the new `status.ts` in each repo, and the list of every file you changed to use it.
2. Confirmation that `not_available`, `puppy` and `breeding_stock` no longer appear as status
   options anywhere — paste the grep.
3. Screenshot of the dog profile header on the website with the new control, on **Eben**
   (`9323ac7c-3547-4576-9594-9d2b01ed7f0f`), who is `in_training`.
4. Screenshot of the same on the app.
5. Screenshot of the deceased warning path and the sold-without-buyer warning.
6. The new test passing.
7. `npx tsc --noEmit` clean in both repos.
