# Cursor Prompt — Make Add Litter refuse to create nonsense

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Every column and constraint needed already exists.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What actually happened

On 15 Sep 2026 Matt used Add Litter once. It produced **two rows, 1.6 seconds apart**:

```
07:50:10.748  name NULL  status planned  actual_date 2026-09-15  sire Ade (sold male)  dam Cait (deceased)
07:50:12.335  name NULL  status planned  actual_date 2026-09-15  sire Ade (sold male)  dam Cait (deceased)
```

They have been deleted. **Five separate faults are visible in those two rows**, and each one is a
missing guard rather than a bug in the ordinary sense. Fix all five.

## Fault 1 — The form submits twice

Two rows 1.6 seconds apart is a double click on a button that stayed enabled, or a retry after an
apparent failure that had in fact already written a row.

Disable the submit button the moment it is pressed and keep it disabled until the server answers.
Show "Saving…" on it. If the save fails, re-enable and show the error **on the form** — an error
the person cannot see is an error they will respond to by clicking again.

Guard the server side as well: if a litter already exists with the same sire, dam and date, return
the existing one rather than creating a second. Two litters from one pairing on one day is not a
real thing.

## Fault 2 — The dam picker offered a dead dog

**Cait is `deceased`.** She was offered as a dam and accepted without a murmur.

Scope the dam picker to **female dogs the kennel still breeds**: `sex = 'female'` and status in
`keep`, `stud`, `retired` — and **exclude `deceased`, and exclude any dog with `deceased_at` set**.
`applyActiveKennelStockFilter` in `lib/dogs/status.ts` already does exactly this; use it rather
than writing the filter again.

If Matt genuinely needs to record a historical litter from a dam that has since died, that is a
different job with a deliberate "include retired and deceased dams" toggle — off by default,
clearly labelled. **Do not solve it by leaving the picker wide open.**

## Fault 3 — The sire picker offered a dog that was sold

**Ade is `sold`** — he belongs to Stefano Peretti. He is not available as a stud.

Scope the sire picker to `sex = 'male'` and status in `stud`, `keep`. Same exclusion of deceased.

**Filter by sex on both pickers, and never share one dog list between them.** A sire picker that
offers a female is how a litter ends up recorded with two dams, and the list is long enough that
nobody notices until the pedigree is wrong.

## Fault 4 — Status `planned` with a birth date of today

A litter cannot be *planned* and *born* at the same time. `actual_date` was set to today, which
means it was defaulted rather than chosen.

Tie the dates to the status and enforce it in both directions:

| Status | Expected date | Actual date |
|---|---|---|
| `planned` | optional | **must be empty** |
| `expected` | **required** | **must be empty** |
| `born` | optional | **required** |

Do not pre-fill `actual_date` with today's date on a planned or expected litter. If the person sets
an actual date, offer to move the status to `born` rather than silently storing the contradiction.

## Fault 5 — No name, so the list reads "LITTER"

`name` was null and the litters list showed a bare "LITTER" twice.

Every other litter follows the same shape: **`Dam × Sire – Mon YYYY`**, for example
`Claire × Santini – Jul 2026`. Generate that automatically from the two pickers and the date as
soon as both are chosen, and show it in a field Matt can overwrite. Never save a litter with no
name — if the generator cannot produce one because a picker is empty, the form is not valid yet.

While you are there: **`litter_letter` is also empty on both rows.** The puppy naming in
`puppy-actions.ts` uses it to name pups `A1`, `A2` and falls back to `Puppy 1` when it is missing.
Suggest the next unused letter for that dam, and let Matt change it.

---

## The general shape of the fix

Every one of these five is the same failure: **the form accepts something the business does not
allow, and the database is not in a position to refuse it.** `dogs_status_check` catches an illegal
status because the constraint exists; nothing catches a deceased dam because no constraint can know
that.

So put the rules in one place — a `validateLitter(input)` function in
`lib/litters/validate.ts`, in both repos — returning a list of problems. Call it from the form to
disable submit and show messages, and call it again in the server action before the insert. A
client-side-only check is a suggestion; a check on both sides is a rule.

Write the messages in Matt's words, not the database's. **"Cait is recorded as deceased and cannot
be a dam"** — not "invalid mother_id".

## Task — App parity

Same validation, same scoping, same double-submit guard on the app. The website is the reference
implementation, and `validateLitter` should be identical in both.

---

## Do not

- Do not add a migration.
- Do not add a database constraint for the deceased-dam rule. Status changes over time and a
  constraint would block legitimate historical edits.
- Do not widen any picker to "all dogs" to make something work. If a picker feels too narrow, say
  so in the report and let Matt decide.
- Do not create test litters in production. Use a local or preview environment.

---

## Report

1. Screenshot of the dam picker showing **Cait is absent**, and the sire picker showing **Ade is
   absent**.
2. Screenshot of the form refusing to save with a planned status and an actual date, with the
   message shown.
3. Screenshot of the auto-generated name appearing as soon as sire, dam and date are set.
4. Proof of the double-submit guard — click submit twice quickly, show one row was created.
5. Proof the server-side check also refuses, by calling the action directly with a deceased dam.
6. The same on the app.
7. `npx tsc --noEmit` clean in both repos.
