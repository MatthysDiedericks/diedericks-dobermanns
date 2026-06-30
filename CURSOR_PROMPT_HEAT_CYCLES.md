# CURSOR PROMPT — Heat Cycle Tracking + Prediction System

## Context

**Project:** Diedericks Dobermanns mobile app
**Folder:** `diedericks-dobermanns/`
**Stack:** React Native, Expo Router, TypeScript, Supabase, NativeWind
**Brand:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`

## What Was Built in the Database

The following already exists in Supabase:
- `heat_cycles` table with all columns including `is_predicted`, `predicted_next_heat_date`, `actual_cycle_length_days`, `proestrus_start_date`, `estrus_start_date`, `heat_end_date`
- `breed_heat_defaults` table with Dobermann defaults (180 day avg cycle, 11 day ovulation offset, 63 day gestation)
- `calculate_next_heat_prediction(dog_id)` function
- `on_heat_confirmed()` trigger — auto-creates next predicted heat when a real heat is confirmed

**Key logic:**
- `is_predicted = true` = system-generated forecast (shown differently in UI)
- `is_predicted = false` = breeder-confirmed actual heat
- When actual heat confirmed → trigger fires → deletes old prediction → creates new prediction based on this dog's personal average cycle length
- If dog has <2 confirmed heats → uses breed default (180 days)
- If dog has 2+ confirmed heats → uses her personal average

---

## STEP 1 — Regenerate Supabase TypeScript Types

```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts
```

---

## STEP 2 — Create `hooks/useHeatCycles.ts`

Create `hooks/useHeatCycles.ts` with these functions:

```ts
// useHeatCyclesForDog(dogId) — all heats for one dog, ordered by date desc
// useActiveHeat(dogId) — current or most recent heat (is_predicted=false, status='active')
// useNextPredictedHeat(dogId) — next predicted heat (is_predicted=true)
// useBreedDefaults() — fetch breed_heat_defaults for Dobermann
// useAddHeatCycle() — insert new heat cycle (triggers auto-prediction)
// useUpdateHeatCycle() — update existing heat cycle
// useConfirmHeat(id) — set is_predicted=false, cycle_confirmed_at=now() on a predicted entry
// useDeleteHeatCycle(id) — delete a heat cycle record
```

All hooks use `supabase` client from `@/lib/supabase`.

Select these columns for heat cycle queries:
```
id, dog_id, heat_start_date, heat_end_date, proestrus_start_date,
estrus_start_date, ovulation_date, mating_date, mating_type,
sire_id, expected_whelp_date, actual_whelp_date, resulting_litter_id,
status, is_predicted, actual_cycle_length_days, cycle_confirmed_at,
progesterone_tests, cancelled_reason, notes, created_at, updated_at
```

---

## STEP 3 — Heat Cycles Admin Screen

Create `app/(admin)/heats/index.tsx` — list of ALL females with their heat status.

### Layout:
- Header: "Heat Cycles" + gold "+" button top right
- Filter tabs: `All | Active | Predicted | Overdue`
- List of female dogs (only show females: `sex = 'female'`)

### Each female card shows:
- Dog photo (small circle) + name
- **If active heat:** red pulsing dot + "In Heat — Day X" (calculate days since heat_start_date)
- **If predicted next heat:** gold clock icon + "Next heat: [date] (in X days)" — shown in muted style
- **If overdue:** orange warning icon + "Overdue — expected [date], [X] days late"
- **If no data:** grey + "No heat history"
- Tap card → navigate to `app/(admin)/heats/[dogId]/index.tsx`

---

## STEP 4 — Dog Heat Detail Screen

Create `app/(admin)/heats/[dogId]/index.tsx`

### Tabs: `Current | History | Predictions`

---

### Tab 1: Current

Shows the active or most recent heat cycle for this dog.

**Top card — Cycle Status:**
- Dog name + photo
- Status badge: `Active` (red) | `Predicted` (gold, dashed border) | `Completed` | `Skipped`
- If `is_predicted = true`: show banner "This is a predicted heat — confirm when actual heat begins"
  - "CONFIRM ACTUAL HEAT" button → opens confirm bottom sheet

**Timeline strip (horizontal):**
Show the 4 phases as a progress bar with today marked:
```
[Proestrus 9d] [Estrus 7d] [Diestrus 75d] [Anestrus ~89d]
     ↑ Day 1        ↑ Day 10    ↑ Day 17        ↑ Day 92
```
Highlight current phase in gold. Use breed defaults from `breed_heat_defaults`.

**Key Dates card:**
| Label | Date | Days Away |
|-------|------|-----------|
| Heat Start | dd MMM yyyy | — |
| Proestrus Start | dd MMM yyyy | X days |
| Estrus Start (fertile) | dd MMM yyyy | X days |
| Ovulation (est.) | dd MMM yyyy | X days |
| Optimal Breeding Window | dd MMM - dd MMM | X days |
| Expected Whelp Date | dd MMM yyyy | X days |

Dates not yet entered show "— not recorded" in muted text.

**Progesterone Tests section:**
- List of tests from `progesterone_tests` JSONB array
- Each test: `{ date, value_ng_ml, lab, notes }`
- Show value with colour coding:
  - < 2 ng/mL = grey (baseline, no ovulation yet)
  - 2–5 ng/mL = yellow (approaching ovulation)
  - > 5 ng/mL = green (ovulation occurred)
  - > 15 ng/mL = gold (optimal breeding window)
- "+ Add Progesterone Test" button → bottom sheet

**Notes field** (editable inline)

**Action buttons:**
- "Edit This Cycle" → bottom sheet with full form
- "Mark as Completed" → sets status = 'completed', heat_end_date = today
- "Record Mating" → bottom sheet for mating details

---

### Tab 2: History

List of all past confirmed heats for this dog (is_predicted = false), newest first.

Each row:
- Heat start date (bold)
- Cycle length: "X days since previous" (actual_cycle_length_days)
- Status badge
- Mating: ✓ or —
- Litter: ✓ or —
- Tap to expand → show key dates inline

**At bottom of history:**
- "Personal average cycle: X days" (calculated from actual_cycle_length_days average)
- "Based on X confirmed cycles"
- "Breed average: 180 days"

---

### Tab 3: Predictions

Show the next 3 predicted heat dates for this dog.

**Prediction card:**
- "Next predicted heat: [date]" — large gold text
- "In X days"
- "Predicted ovulation: [date]"
- "Predicted whelping window: [date range] (if bred)"
- Source note: "Based on [her personal average X days | Dobermann breed average 180 days]"

**Prediction accuracy notice:**
- Grey info box: "Predictions update automatically when you confirm each actual heat. The more cycles recorded, the more accurate the prediction."

**Calendar view (simple):**
Show a 12-month strip with predicted heat windows marked in gold and predicted fertile windows marked in red.

---

## STEP 5 — Bottom Sheets

### 5a — Add / Edit Heat Cycle Bottom Sheet

Fields:
```
Heat Start Date* (date picker)
Proestrus Start Date (date picker)
Estrus Start Date (date picker) — auto-fills: heat_start + 9 days
Ovulation Date (date picker) — auto-fills: heat_start + 11 days
Heat End Date (date picker)
Status (picker): active | completed | skipped | anovulatory
Notes (multiline text)
```

Auto-calculate and show (read-only, updates live as dates entered):
- Optimal breeding window (ovulation date to ovulation + 4 days)
- Expected whelp date (ovulation + 63 days)

### 5b — Confirm Actual Heat Bottom Sheet

Used when confirming a predicted entry:
```
"Confirm Actual Heat Start"
Actual Heat Start Date* (date picker — pre-filled with predicted date)
Notes (optional)
[CONFIRM] button
```

On confirm:
- Sets `is_predicted = false`
- Sets `cycle_confirmed_at = now()`
- Updates `heat_start_date` to actual date entered
- Trigger fires automatically → creates next prediction

### 5c — Add Progesterone Test Bottom Sheet

```
Test Date* (date picker)
Value (ng/mL)* (numeric input)
Lab / Vet (text)
Notes (text)
```

Saves to `progesterone_tests` JSONB array on the heat cycle record.

### 5d — Record Mating Bottom Sheet

```
Mating Date* (date picker)
Mating Type (picker): natural | fresh_chilled | frozen | surgical_ai
Sire (dog picker — filtered to males)
Notes (text)
```

Auto-updates `expected_whelp_date = ovulation_date + 63`.

---

## STEP 6 — Overdue Heat Alert Logic

In `useHeatCyclesForDog`, add computed field `is_overdue`:
```ts
// A predicted heat is overdue if:
// predicted heat_start_date < today AND is_predicted = true
const isOverdue = heat.is_predicted && 
  new Date(heat.heat_start_date) < new Date()
```

Show overdue females with orange warning on the main heats list screen.

---

## STEP 7 — Integrate into Dog Detail Screen

In the existing dog detail screen (`app/(admin)/dogs/[id]/index.tsx`), the **Breeding tab** should show:

- Current heat status summary card (pull from `useActiveHeat(dogId)`)
- Next predicted heat date (pull from `useNextPredictedHeat(dogId)`)
- "View Full Heat History →" link → navigates to `app/(admin)/heats/[dogId]/index.tsx`
- Last 3 heats in a compact list

---

## STEP 8 — Reusable Components

Create these in `components/heats/`:

- `HeatStatusBadge.tsx` — pill badge with colour per status
- `PhaseTimeline.tsx` — horizontal 4-phase progress bar
- `ProgesteroneChart.tsx` — simple line chart of progesterone values over time (use `react-native-svg` or `victory-native`)
- `PredictionCard.tsx` — gold card showing next predicted heat + source
- `CycleHistoryRow.tsx` — compact history list row

---

## STEP 9 — Navigation

Add to sidebar/tab navigation:
- "Heats" menu item (existing) → `app/(admin)/heats/index.tsx`

Ensure deep link works: `app/(admin)/heats/[dogId]/index.tsx`

---

## STEP 10 — In-App Breeding Reference (Help Screens)

Create `app/(admin)/heats/reference.tsx` — a scrollable reference screen accessible from the heat cycles section.

Add a "?" icon button in the top-right header of `app/(admin)/heats/index.tsx` and `app/(admin)/heats/[dogId]/index.tsx` that navigates to this reference screen.

### Reference screen sections (use `SectionCard` component, gold headers):

**Section 1 — Heat Cycle Predictions**
- Table: "First heat recorded → uses breed average 180 days"
- Table: "2+ heats recorded → uses this female's personal average"
- Note: "Predictions update automatically each time you confirm a real heat"

**Section 2 — Dobermann Heat Phases**
- Table with 4 rows: Proestrus (9 days), Estrus (7 days), Diestrus (75 days), Anestrus (89 days)
- Each row: phase name, duration, plain-language description

**Section 3 — Progesterone Guide**
- 4 rows with colour-coded left border:
  - Grey: < 2 ng/mL — Baseline, too early
  - Yellow: 2–5 ng/mL — Approaching ovulation, test every 1–2 days
  - Green: 5–15 ng/mL — Ovulation occurred, breed now
  - Gold: > 15 ng/mL — Peak, optimal breeding window

**Section 4 — Whelping Dates**
- "From mating date:" — Earliest +57d, Expected +60d, Latest +65d
- "From ovulation date (more accurate):" — Earliest +60d, Expected +63d, Latest +66d
- Gold info box: "Always use ovulation date when available — significantly more accurate"

**Section 5 — Puppy Go-Home Dates**
- Table: Earliest +8 weeks, Standard +9 weeks, Latest +10 weeks
- Note: "Recalculates automatically when actual birth date is recorded"

**Section 6 — What Updates Automatically**
- Table: You enter X → System calculates Y
- Rows: Heat start date, Mating date, Ovulation date, Actual birth date, 2nd confirmed heat

**Section 7 — Heat Status Indicators**
- 🔴 Red dot = In Heat (Day X)
- 🟡 Gold = Predicted upcoming heat
- 🟠 Orange = Overdue (predicted date passed)
- ⚪ Grey = No history recorded

---

## Testing Checklist

- [ ] All female dogs appear on heats list screen
- [ ] Active heat shows "Day X" correctly
- [ ] Predicted heat shows dashed/muted style
- [ ] Overdue heat shows orange warning
- [ ] Add new heat → auto-calculates ovulation and whelp dates
- [ ] Confirm predicted heat → is_predicted flips to false → new prediction created automatically
- [ ] After 2+ confirmed heats → prediction uses dog's personal average (not breed default)
- [ ] Progesterone test colour coding works (< 2 grey, 2-5 yellow, > 5 green, > 15 gold)
- [ ] Mating recorded → expected_whelp_date updates
- [ ] History tab shows personal average cycle length
- [ ] Predictions tab shows correct source (personal vs breed average)
- [ ] Dog Detail breeding tab shows current heat summary
