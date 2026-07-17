# CURSOR PROMPT — Link Litters to Breedings (heat_cycles) + "No Outcome"
*Run in Cursor Agent mode with the `diedericksdobermann App` folder open as the workspace root. Complete tasks in order.*

---

## Context

**Project:** Diedericks Dobermanns mobile app · React Native / Expo SDK 56 · TypeScript strict · Supabase (`nlmwxodvquwbjinhhbmr`)

The goal: stop re-typing dam/sire/dates when creating a litter. Every breeding is already
recorded in the **`heat_cycles`** table with the dam, the sire, the mating date, and the due date.
A litter should be creatable **from an existing breeding** — pick the breeding, everything
pre-fills — and a breeding that produces no pups should be markable as **"No outcome."**

### Key schema facts (already true in the live DB — do NOT re-create these)
- `heat_cycles` columns include: `id`, `dog_id` (the DAM), `sire_id` (the SIRE), `mating_date`,
  `expected_whelp_date`, `whelp_date_earliest`, `whelp_date_latest`, `actual_whelp_date`,
  `resulting_litter_id` (uuid, currently null — THIS is the link to a litter), `status`,
  `cancelled_reason`, `notes`.
- `heat_cycles.status` is free text (no enum constraint) — a new value like `'no_outcome'` needs
  no migration.
- `litters` columns include: `mother_id`, `father_id`, `mating_date`, `expected_date`,
  `actual_date`, `status`, `male_count`, `female_count`, `puppy_count`, `available_count`.
- Foreign keys already exist: `heat_cycles_sire_id_fkey` (sire_id → dogs), and `dog_id → dogs`.

### Already done directly (do NOT redo)
- `hooks/useBreedingDogs.ts` now selects breeding dogs by `status in ('keep','stud','breeding_stock')`
  (was wrongly filtered on `is_public=false`, returning nothing). Dam/sire pickers now populate.
- `components/forms/LitterForm.tsx`: removed "Placed" status, added male/female pup count inputs,
  surfaces save errors.
- `types/app.types.ts` `Litter` interface now has `male_count` / `female_count`.

---

## Task 1 — Hook: `useActiveBreedings()` in `hooks/useActiveBreedings.ts`

Fetch breedings that have a recorded mating but no litter yet, for the litter picker.

```
SELECT from heat_cycles:
  id, dog_id, sire_id, mating_date, expected_whelp_date, whelp_date_earliest, whelp_date_latest, status,
  dam:dogs!heat_cycles_dog_id_fkey(id, name),
  sire:dogs!heat_cycles_sire_id_fkey(id, name)
WHERE mating_date IS NOT NULL
  AND resulting_litter_id IS NULL
  AND status NOT IN ('no_outcome','cancelled','completed')
ORDER BY mating_date DESC
```
(If the `heat_cycles_dog_id_fkey` alias name differs, resolve the real constraint name first with a
`pg_constraint` query — do not guess.)

Return shape: `{ breedings, loading, error, refresh }` where each breeding exposes
`{ id, damId, damName, sireId, sireName, matingDate, expectedWhelpDate }`. Standard hook pattern
(loading/error/refresh), JSDoc, under 120 lines. Handle empty gracefully (heat_cycles is currently
empty — the picker must show a friendly "No open breedings" state, not crash).

## Task 2 — Litter form: "Create from an existing breeding" picker

In `components/forms/LitterForm.tsx`, add an **optional** picker at the TOP of the form (above
Litter name), only shown when creating a NEW litter (not when editing an existing one):

- Label: "Start from a breeding (optional)".
- Uses `useActiveBreedings()`. Each option shows: `"{Dam} × {Sire} · mated {matingDate} · due ~{expectedWhelpDate}"`.
- On select, pre-fill via `setValue`: `mother_id = damId`, `father_id = sireId`,
  `status = 'born'`, `actual_date = today` (editable), and if `expected_whelp_date` exists set it too.
  Also stash the selected `heat_cycles.id` in form state (e.g. a `selectedBreedingId` useState) so
  Task 3 can link it on save.
- Manual dam/sire selection must still work when no breeding is picked (leave that path untouched).
- Reuse the existing modal/picker styling pattern from `DogSelectField.tsx` — do not add a new dependency.

## Task 3 — On save, link the litter back to the breeding

In the litter save flow (`onValid` → `saveLitter`), after a NEW litter is inserted successfully AND
a breeding was selected:
- Update that `heat_cycles` row: `resulting_litter_id = <new litter id>`, `actual_whelp_date = litter.actual_date`, `status = 'completed'`.
- `saveLitter` currently returns only `{ error }` — change it (in `lib/dogs/mutations.ts`) to return
  the new litter's `id` on insert (`.insert(values).select('id').single()`), so the caller can link it.
  Keep the admin-only RLS working (Matt is super_admin; is_admin() passes).
- This linking update is best-effort: if it fails, still treat the litter as saved, but log the error.

## Task 4 — "No outcome" action on a breeding

On the Kennel → **Expecting** list (`components/dogs/DogsDirectoryScreen.tsx` + its `ExpectingDogCard`,
and/or the breeding detail screen — find where expecting breedings render), add a **"No outcome"**
action (button or long-press menu) on each expecting breeding:
- Confirms with the user ("Mark this breeding as producing no puppies?").
- Updates the `heat_cycles` row: `status = 'no_outcome'`, `cancelled_reason = 'No litter produced'`
  (or a short reason if you add an optional input). Do NOT delete the record — it stays as history.
- After update, it drops off the Expecting list (Task 1's query already excludes `no_outcome`).
- Add a `markBreedingNoOutcome(heatCycleId)` mutation in the appropriate mutations file with error handling.

## Task 5 — Show "no outcome" breedings somewhere sensible

Breedings marked `no_outcome` should still be visible as history (not silently gone). Simplest:
show them in the breeding/heat history for that dam (wherever a dam's past cycles already list), with
a muted "No outcome" badge. If no such history view exists yet, note it and skip — do not build a new
screen for this.

## Task 6 — Expected litters surface in the CLIENT PORTAL with ETAs

Clients should see upcoming/expected litters with an estimated arrival window, so they know when
pups are coming. A breeding has a start and end window already computed:
`heat_cycles.whelp_date_earliest` / `whelp_date_latest` / `expected_whelp_date`, and go-home window
`go_home_earliest` / `go_home_latest`. Litters also have `expected_date` / `go_home_date`.

- In the client portal (screens live under `app/(portal)/` — find the portal home/landing and add a
  section, or add a dedicated "Expected Litters" portal screen if that's cleaner).
- Data: an "expected litter" = either a `litters` row with `status in ('planned','expected','born')`
  and `is_public = true`, OR an active `heat_cycles` breeding (mating recorded, no resulting litter,
  status not no_outcome/cancelled). Prefer showing the litter row if it exists, otherwise the breeding.
- Show per item: dam × sire, **estimated pups ETA window** (earliest–latest whelp date, and the
  `expected_date`/`expected_whelp_date` as the headline "~due" date), estimated go-home window, and
  available/reserved count if known. Label estimates clearly as ESTIMATES ("Estimated arrival",
  "dates may shift").
- Read-only for clients. Respect RLS — clients must only see public/appropriate rows, never internal
  breeding notes. Put the query in a hook (`hooks/useExpectedLittersPortal.ts`), loading/empty/error states.

## Task 7 — Health schedule (deworming + vaccination) follows a sold dog into the owner's portal

When a dog is sold, its forecasted health schedule must appear in that client's portal so they keep
vaccinations and deworming up to date.

- Ownership link: a sold/placed dog is tied to its client via `dogs.owner_id` (confirm this is the
  authoritative link; `reservations.client_id + dog_id` is the alternative — verify which is populated
  on sale before building, don't guess).
- Data sources (all already have forecasting via `next_due_date`):
  - `vaccinations` (vaccine_name, date_administered, next_due_date)
  - `deworming_records` (product_name, treatment_date, next_due_date)
  - optionally `puppy_health_records` (record_type, record_date, next_due_date) for early-life records
  - `calendar_events` (event_type, event_date, dog_id, is_reminder) already unifies scheduled items —
    prefer reading upcoming health events from here if health records write to it; otherwise union the
    tables above.
- Build a client-portal "Health Schedule" view (hook `hooks/useDogHealthSchedule.ts`) that, for each
  dog the logged-in client owns, lists: past records and **upcoming due dates** (next_due_date in the
  future), sorted by date, with an "overdue" flag for anything past due. Group by dog if the client
  owns more than one.
- Add a link/entry point to it from the portal home. Read-only for clients (they view the schedule;
  admins/trainers still own editing it).
- RLS: a client must only see health records for dogs they own. Verify a policy allows
  `owner_id = auth.uid()` (or via reservations) to SELECT vaccinations/deworming for their dog; if no
  such policy exists, add one via migration (`ADD POLICY ... USING (dog is owned by auth.uid())`),
  admin/trainer keep full access. Do NOT open these tables to all authenticated users.

---

## Testing checklist
- [ ] Dam/sire pickers list all breeding dogs (keep/stud/breeding_stock)
- [ ] With no breedings recorded, the "Start from a breeding" picker shows a friendly empty state (no crash)
- [ ] After recording a mating in heat_cycles, it appears in the picker with correct dam × sire and dates
- [ ] Selecting a breeding pre-fills dam, sire, status=born, dates — and manual editing still works
- [ ] Saving a litter created from a breeding sets that heat_cycles.resulting_litter_id + status=completed
- [ ] "No outcome" marks the breeding, drops it from Expecting, keeps it as history
- [ ] Client portal shows expected litters with clearly-labelled estimated ETA + go-home windows (read-only)
- [ ] A client who owns a sold dog sees that dog's upcoming vaccination + deworming due dates, with overdue flags
- [ ] RLS verified: a client canNOT see another client's dog health records or internal breeding notes
- [ ] `npm run typecheck` passes clean
- [ ] No file over 300 lines; logic in hooks, not the screen

## Critical rules
- Do NOT re-create any table or column — all needed columns already exist.
- Do NOT change `useBreedingDogs.ts` (already fixed) except if typecheck forces a type tweak.
- Do NOT expose the service role key. Admin-only RLS must keep protecting writes.
- Verify real FK constraint names via pg_constraint before using `!fkey` hints — don't guess.
- Regenerate `types/database.types.ts` if you rely on new columns; otherwise a local cast is fine.
