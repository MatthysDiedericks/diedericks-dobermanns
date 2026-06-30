# CURSOR PROMPT — Fix: Heats, Health Records & Calendar Data

## What's Broken

1. **Heat Cycles screen** — shows no data (heat_cycles table is empty, no add form working)
2. **Vet Visits** — not saving or pulling through
3. **Calendar** — not receiving events from health records or heat cycles
4. **Call sign** — `dogs.call_sign` referenced in code but column is `call_name`

## Your Job

Review ALL files related to heats, health, and calendar. Find every bug and fix it. Do not skip anything. Work through each section below.

---

## SECTION 1 — Fix call_sign → call_name everywhere

Search the entire codebase for `call_sign` and replace with `call_name`.
Files likely affected: `hooks/useDogs.ts`, `app/(admin)/dogs/index.tsx`, any search/filter logic.

---

## SECTION 2 — Fix Heat Cycles

### 2a — Check the hook
Open `hooks/useHeatCycles.ts` (or `hooks/useHeats.ts` — whichever exists).

Verify the select query includes ALL these columns:
```
id, dog_id, heat_start_date, heat_end_date, proestrus_start_date,
estrus_start_date, ovulation_date, mating_date, mating_type,
sire_id, expected_whelp_date, actual_whelp_date, resulting_litter_id,
status, is_predicted, actual_cycle_length_days, cycle_confirmed_at,
whelp_date_earliest, whelp_date_latest, go_home_earliest, go_home_latest,
progesterone_tests, cancelled_reason, notes, created_at, updated_at
```

If any of these columns are missing from the select, add them.

### 2b — Check the Add Heat form
Find the screen or bottom sheet where a new heat cycle is added.

Verify the INSERT includes at minimum:
```ts
{
  dog_id: selectedDogId,
  heat_start_date: date,
  is_predicted: false,
  status: 'active'
}
```

If the form doesn't exist or isn't wired up, create a working Add Heat bottom sheet with:
- Dog picker (females only: sex = 'female', status IN ('keep'))
- Heat start date (date picker)
- Notes (optional)
- Save button that inserts to heat_cycles table

### 2c — Check the heats list screen
Open `app/(admin)/heats/index.tsx`.

Make sure it:
1. Calls the hook and gets data
2. Shows a proper empty state with an "Add Heat" button when no records exist
3. The "+" button in the header opens the Add Heat form

### 2d — Check RLS
Run this mental check: the heats screen uses the anon/authenticated Supabase client. Make sure the query isn't being blocked by RLS. The existing RLS policy is:
- `Admin full access to heat_cycles` — using `is_admin()`

If `is_admin()` is returning false (same bug as the ACCESS RESTRICTED issue), the query returns empty. Add a fallback: if the heat cycles query returns empty AND the user has role super_admin, retry with `.select()` without filters to confirm RLS is the issue.

Fix: ensure the Supabase client used in hooks has the authenticated session attached (not the anon client without session).

---

## SECTION 3 — Fix Vaccinations, Deworming, Vet Visits

### 3a — Check each hook
Open `hooks/useHealth.ts`.

For each of these functions, verify the select includes the NEW columns added to the database:
- `vaccinations`: `schedule_type, doctor_name, vet_practice_id, health_product_id`
- `deworming_records`: `schedule_type, treatment_type, doctor_name, vet_practice_id, health_product_id`
- `vet_visits`: `schedule_type, next_due_date, doctor_name, vet_practice_id`

If these columns are missing from the select query, add them.

### 3b — Check the Add forms
Find the add/edit forms for vaccinations, deworming, and vet visits.

Verify each form:
1. Has a working dog picker
2. Has a date picker that works
3. Submits correctly to Supabase
4. Shows success feedback after save
5. Refreshes the list after save

If any form is missing the new fields (schedule_type, doctor_name, vet_practice_id), add them.

### 3c — Check vet_practices and health_products hooks
Verify `useVetPractices()` and `useHealthProducts(category)` exist and query:
- `SELECT * FROM vet_practices WHERE is_active = true ORDER BY practice_name`
- `SELECT * FROM health_products WHERE is_active = true AND category = ? ORDER BY product_name`

If these hooks don't exist, create them.

---

## SECTION 4 — Fix Calendar

### 4a — Check calendar_events hook
Find `hooks/useCalendar.ts` or wherever calendar events are fetched.

The correct query is:
```ts
supabase
  .from('calendar_events')
  .select(`
    id, title, event_type, event_date, end_date,
    dog_id, is_completed, is_reminder, notes,
    dogs(name, status)
  `)
  .order('event_date', { ascending: true })
```

If this hook doesn't exist, create it.

### 4b — Check the calendar screen
Open `app/(admin)/calendar/index.tsx`.

Verify it:
1. Uses the calendar hook to fetch events
2. Renders events on the correct dates
3. Shows event type with colour coding:
   - Vaccination → blue
   - Deworming / tick_flea → green
   - Vet visit → purple
   - Heat predicted → gold (dashed)
   - Heat confirmed → red
   - Whelping → gold
   - Go home → teal

### 4c — Verify triggers are firing
The database has triggers that auto-create calendar_events when health records are saved. These are server-side and should work automatically. To verify:

In the app, after saving a vaccination, immediately navigate to the calendar screen. If the event doesn't appear, the issue is the calendar hook not refetching — add `refetch()` or invalidate the cache after any health record is saved.

Add this to all health record mutation hooks (after successful insert/update):
```ts
// Invalidate calendar cache after saving
queryClient.invalidateQueries(['calendar_events'])
// OR if not using react-query:
await refetchCalendarEvents()
```

---

## SECTION 5 — Add Seed Data for Testing

After fixing all the above, insert ONE test heat cycle for Cendra so we can verify the screen works:

```ts
// In Cursor terminal or as a test action in the app:
// Dog ID for Cendra: check dogs table
// Insert: heat_start_date = 2026-06-20, status = 'active', is_predicted = false
```

Insert via the app's Add Heat form once it's working — this confirms the full flow end to end.

---

## SECTION 6 — Final Checks

After all fixes:
- [ ] Dogs screen shows all breeding stock (no call_sign error)
- [ ] Heats screen shows list of females with their heat status
- [ ] Add Heat form opens, fills, and saves successfully
- [ ] After saving a heat → a predicted next heat appears in the list
- [ ] Vaccinations list shows all dogs
- [ ] Add Vaccination form saves correctly
- [ ] Vet visits list shows dogs
- [ ] Add Vet Visit form saves correctly
- [ ] Calendar screen shows events after health records are saved
- [ ] Calendar events are colour coded by type
- [ ] No TypeScript errors anywhere in these files
