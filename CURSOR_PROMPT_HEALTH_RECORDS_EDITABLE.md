# Cursor Prompt — Make health records editable and reachable

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done, plus `npm run parity`. Paste the real output.

---

## The complaint

Felicia (role `admin`) cannot edit vaccinations or dewormings. I verified this is **not a
permissions problem** before writing this prompt — do not "fix" auth:

- `is_admin()` returns **true** for her. Confirmed by running as her JWT.
- Under her session, UPDATE and INSERT on `vaccinations` and `deworming_records` both
  **succeed**. Tested and rolled back.
- `requireAdmin()` accepts `admin` as well as `super_admin` (`ADMIN_ROLES` in
  `src/lib/admin/auth.ts`).

The database and the auth layer are fine. **The UI has no edit path, and on the dog profile it
has no deworming list at all.** That is the whole bug.

---

## Bug 1 — Nothing in the admin UI can edit a health record

`saveHealthRecord` in `src/app/admin/(panel)/health/actions.ts` already takes an optional `id`
and does an UPDATE when it is present. The server action is finished and correct.

**No component ever passes an `id`.** Grep it and see:

- `HealthRecordForm` is only ever mounted for creating.
- `HealthRecordRows` (`src/components/health/HealthRecordRows.tsx`) offers **Delete only**.
- `VaccinationsManager` (`src/components/admin/VaccinationsManager.tsx`) offers **Delete only**.

So Felicia's only way to correct a typo is delete and retype. If she deletes and then the
re-add fails, the record is simply gone.

**Fix:** an Edit action on every health record row that loads the record into
`HealthRecordForm` with its `id` populated, so the existing UPDATE branch is used. Form title
changes to "Edit treatment", and there is a Cancel that clears the edit state.

## Bug 2 — The dog profile shows no dewormings whatsoever

`src/components/admin/DogHealthEditTab.tsx` renders a `VaccinationsManager` and a create form
with `defaultKind="deworming"` — but **no deworming list**. `defaultKind` only preselects the
kind on the *create* form. The dog page
(`src/app/admin/(panel)/dogs/[id]/page.tsx`) never even queries `deworming_records`.

Jazzmine has **5** deworming records. On her profile, all 5 are invisible and unreachable.

**Fix:** query dewormings (and vet visits) for the dog and render them in the same tab, each
with Edit and Delete, newest first, exactly like vaccinations. Show `next_due_date` with the
existing `DueChip`.

## Bug 3 — `/admin/health` shows 8 records for the entire kennel

`RECENT_LIMIT = 8` in `src/app/admin/(panel)/health/page.tsx`, applied per kind across **all
dogs**. Live counts: **175 dewormings, 109 vaccinations, 191 dogs**.

The 8th-newest deworming is dated 2026-08-20 and the 8th-newest vaccination 2026-08-10. So
anything older than about five weeks is unreachable from this page. Of Jazzmine's 5 dewormings
only the 24 Aug one appears; of her vaccinations only the 12 Aug one.

Combine bugs 2 and 3 and Felicia genuinely has **nowhere** to edit most of Jazzmine's history.
That is what she was reporting.

**Fix:** filter by dog and paginate. A dog picker (reuse the one in `HealthRecordForm`), a kind
filter, and either pagination or a sensible per-dog limit. `RECENT_LIMIT = 8` across the whole
kennel is not a list, it is a teaser. Keep a "recent activity" view if you like, but it must
not be the only way in.

## Bug 4 — Clearing a vaccination's next-due date silently does nothing

In `writeRecord`, `shared` spreads the date conditionally:

```ts
...(nextDue ? { next_due_date: nextDue } : {})
```

The deworming branch then sets `next_due_date: nextDue` explicitly, so it **can** be cleared.
The vaccination branch does not, so on edit the key is absent from the payload and the old
value stays. The user clears the field, saves, sees success, and the date is still there.

**Fix:** always send `next_due_date` on update, including as `null`. Same for the vet-visit
`follow_up_date`. Add a test that clearing the field actually nulls the column.

---

## What must NOT change

- Do not touch `is_admin()`, `is_trainer_or_above()`, `ADMIN_ROLES`, or any RLS policy on
  these tables. They are correct. A permissions change here would be a real security
  regression chasing a bug that is not in permissions.
- Do not add a `super_admin`-only gate to health editing. Felicia must be able to do this;
  that is the point.
- Deleting is already possible. Do not make Delete the answer to Edit.

---

## Data already loaded — do not re-import

I pulled the DogBreederPro kennel health export today (372 vaccinations, 595 dewormings) and
reconciled it. **The honest number is 3**, not 683:

| | |
|---|---|
| DBP health rows total | 967 |
| For the 16 dogs we track health on | 234 |
| Already present on our side, same dog and date | 182 |
| **Confirmed treatments DBP had and we did not** | **3 — now inserted** |
| DBP rows marked `unconfirmed` | 49 — these are *due dates*, not treatments given |
| For sold puppies and pedigree ancestors we hold no health for | 733 |

The 3 inserted, logged in `dbp_import.health_insert_log` with an undo record:

- Jazzmine — Vangaurd Plus 5, 22 Sep 2026
- Hannah — 5 in 1, 3 Jul 2025
- Hannah — Tri-Worm, 29 Jun 2025

**Do not import the 49 unconfirmed rows as treatments.** Most are 2027 annual boosters; several
past ones have a blank product name and are worthless. If you want them, they belong in
`next_due_date`, not as rows claiming a treatment was given.

**Do not import the 733.** Those are sold dogs and ancestors. Whether to carry their health
history is Matt's scope decision, not an import you make on your own.

### Two findings for Matt, not for you to fix

1. **Jazzmine's third Antizol conflicts.** We hold **14 Jul 2026**; DBP says **17 Jul 2026**.
   Both sides hold a value, so per the project rules this is listed, not overwritten.
2. **Her DBP name is "Puppy 1 Jazzmine", not "Jazzmine".** A call-name match misses her. If you
   write any DBP sync, match on name **containment plus date of birth**, never call name alone.

---

## Tests

- Editing a vaccination changes it rather than creating a duplicate.
- Editing a deworming likewise.
- Clearing `next_due_date` on a vaccination nulls the column.
- Jazzmine's profile shows all 5 dewormings and all 3 vaccinations, each editable.
- `/admin/health` filtered to Jazzmine shows every record she has, not 8 kennel-wide.
- Felicia's role (`admin`) can do all of the above. Test as `admin`, not only `super_admin` —
  this is the case that was never exercised.
- Deleting still works and still asks for confirmation.

## Do not

- Do not create test health records in production. Use a test dog and clean up, and prove it.
- Do not change `dbp_import.health_insert_log` or the 3 inserted rows.
- Do not widen any RLS policy.

## Report

1. Proof the edit path uses UPDATE — the record id before and after, unchanged.
2. Jazzmine's profile with all 8 of her records listed and editable. Screenshot.
3. `/admin/health` filtered to one dog, showing more than 8 rows exist and are reachable.
4. A vaccination with its next-due date cleared, read back from the database as null.
5. Proof an `admin` (not super_admin) session can edit and delete.
6. `npx tsc --noEmit` clean in both repos, `npm run parity` clean.
