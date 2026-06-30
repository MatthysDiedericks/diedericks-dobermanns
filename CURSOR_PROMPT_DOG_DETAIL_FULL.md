# CURSOR PROMPT — Dog Detail + Litter Puppy Weights (Data In & Out)

## Context

**Project:** Diedericks Dobermanns mobile app
**Stack:** React Native, Expo SDK 56, Expo Router, TypeScript strict, NativeWind, Supabase
**Supabase project ID:** `nlmwxodvquwbjinhhbmr`
**Supabase URL:** `https://nlmwxodvquwbjinhhbmr.supabase.co`
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`

**What already exists:**
- `hooks/useDogs.ts` — has `useDog(id)` and `DOG_DETAIL_SELECT` (needs updating)
- `hooks/useHealth.ts` — has vaccinations, vet visits, deworming (all-dogs queries; need per-dog versions)
- `hooks/useHeats.ts` — heat cycle hooks (need per-dog)
- `app/(admin)/dogs/[id]/edit.tsx` — basic edit screen using `DogForm`
- `app/(admin)/dogs/[id]/photos.tsx` — photo management
- `app/(admin)/dogs/[id]/pedigree.tsx` — pedigree editor
- `app/(admin)/dogs/[id]/story.tsx` — training story
- `components/forms/DogForm.tsx` — existing dog form (needs new fields added)
- `database.types.ts` at project root — Supabase-generated types

**What was just migrated to Supabase (new columns + tables):**

New columns on `dogs` table:
- `call_name TEXT`
- `coat_type TEXT`
- `height_cm NUMERIC`
- `ear_type TEXT` — values: `'natural'`, `'cropped'`, `'unknown'`
- `eye_colour TEXT`
- `tattoo_number TEXT`
- `passport_number TEXT`
- `dna_number TEXT`
- `insurance_number TEXT`
- `registration_type TEXT`
- `location TEXT`
- `is_spayed_neutered BOOLEAN DEFAULT FALSE`
- `wrights_coi NUMERIC`

New tables (all have `dog_id UUID REFERENCES dogs(id)`, RLS enabled):
- `dog_shows` — id, dog_id, title, location, club, organisation, start_date, end_date, placement, award, notes, created_at
- `medical_conditions` — id, dog_id, condition_name, diagnosed_date, resolved_date, is_active BOOLEAN, notes, created_at
- `weight_logs` — id, dog_id, weight_kg, recorded_date DATE, notes, created_at
- `health_tests` — id, dog_id, test_name, result, tested_date, lab, certificate_url, notes, created_at

---

## Your Job

Build a **fully functional Dog Detail admin section** where every piece of data actually saves to Supabase and loads back correctly. This is the section admins use to manage every aspect of a dog — like a professional kennel management system.

The UI reference is DogBreederPro (a third-party breeding tool). We are building the same capability inside our own app.

---

## STEP 1 — Regenerate TypeScript Types

Run this command first and do NOT proceed until it completes:

```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr --schema public > database.types.ts
```

This ensures the new columns and tables are typed correctly.

---

## STEP 2 — Update `DOG_DETAIL_SELECT` in `hooks/useDogs.ts`

In `hooks/useDogs.ts`, update the `DOG_DETAIL_SELECT` constant to include ALL new columns:

```typescript
const DOG_DETAIL_SELECT =
  'id, name, call_name, breed, colour, sex, date_of_birth, location, ' +
  'microchip_number, tattoo_number, passport_number, dna_number, insurance_number, ' +
  'registration_number, registration_type, ' +
  'bloodline, description, temperament_notes, training_notes, ' +
  'health_tested, hip_score, elbow_score, dcm_status, ' +
  'coat_type, height_cm, ear_type, eye_colour, ' +
  'is_spayed_neutered, wrights_coi, ' +
  'genetics_b_locus, genetics_d_locus, genetics_vwd_status, genetics_dcm1_status, genetics_dcm2_status, genetics_notes, ' +
  'status, category, price, is_public, is_featured, ' +
  'father_id, mother_id, litter_id, owner_id, ' +
  'dog_media(id, url, thumbnail_url, is_primary, type, sort_order, caption)';
```

Also update the `Dog` type in `types/app.types.ts` to include all new fields:

```typescript
call_name?: string | null;
coat_type?: string | null;
height_cm?: number | null;
ear_type?: 'natural' | 'cropped' | 'unknown' | null;
eye_colour?: string | null;
tattoo_number?: string | null;
passport_number?: string | null;
dna_number?: string | null;
insurance_number?: string | null;
registration_type?: string | null;
location?: string | null;
is_spayed_neutered?: boolean;
wrights_coi?: number | null;
```

---

## STEP 3 — Create New Per-Dog Hooks

Create `hooks/useDogDetail.ts` — a single file with all per-dog data hooks. Keep each hook under 60 lines. This file must stay under 300 lines total.

### 3a. `useDogShows(dogId: string)`

```typescript
// Fetches and manages show records for a specific dog.
// Returns: shows[], loading, error, refresh, addShow, deleteShow
```

- `addShow(data)` → inserts to `dog_shows`
- `deleteShow(id)` → deletes from `dog_shows`
- Query: `id, dog_id, title, location, club, organisation, start_date, end_date, placement, award, notes` ordered by `start_date DESC`
- Error handling: toast on failure, console.error with `[useDogShows]` prefix

### 3b. `useMedicalConditions(dogId: string)`

```typescript
// Fetches and manages medical conditions for a specific dog.
// Returns: conditions[], loading, error, refresh, addCondition, updateCondition, deleteCondition
```

- `addCondition(data)` → inserts to `medical_conditions`
- `updateCondition(id, data)` → updates `is_active` or any field
- `deleteCondition(id)` → deletes row
- Query: `id, condition_name, diagnosed_date, resolved_date, is_active, notes` ordered by `is_active DESC, diagnosed_date DESC`

### 3c. `useWeightLogs(dogId: string)`

```typescript
// Fetches and manages weight history for a specific dog.
// Returns: logs[], loading, error, refresh, addWeight, deleteWeight
```

- `addWeight(weight_kg, recorded_date, notes?)` → inserts to `weight_logs`
- `deleteWeight(id)` → deletes row
- Query: `id, weight_kg, recorded_date, notes` ordered by `recorded_date DESC`

### 3d. `useHealthTests(dogId: string)`

```typescript
// Fetches and manages formal health test results for a specific dog.
// Returns: tests[], loading, error, refresh, addTest, deleteTest
```

- `addTest(data)` → inserts to `health_tests`
- `deleteTest(id)` → deletes row
- Query: `id, test_name, result, tested_date, lab, certificate_url, notes` ordered by `tested_date DESC`

### 3e. Update `hooks/useHealth.ts` — add per-dog overloads

Add these new exported functions to `hooks/useHealth.ts`:

```typescript
export function useVaccinationsForDog(dogId: string)
// Same query as useVaccinations() but adds .eq('dog_id', dogId)
// Returns: vaccinations[], loading, error, refresh, addVaccination, deleteVaccination

export function useVetVisitsForDog(dogId: string)
// Same as useVetVisits() but filtered by dog_id
// Returns: visits[], loading, error, refresh, addVisit, deleteVisit

export function useDewormingForDog(dogId: string)
// Query deworming_records where dog_ids column contains the dogId
// .contains('dog_ids', [dogId])
// Returns: records[], loading, error, refresh
```

For `addVaccination(dogId, data)`:
- Insert: `dog_id, vaccine_name, date_administered, next_due_date, administered_by, batch_number, notes`

For `addVisit(dogId, data)`:
- Insert: `dog_id, visit_date, vet_name, clinic_name, reason, diagnosis, treatment, medications, follow_up_date, cost, notes`

### 3f. Update `hooks/useHeats.ts` — add per-dog version

Add:
```typescript
export function useHeatCyclesForDog(dogId: string)
// Filter heat_cycles by dog_id
// Returns: cycles[], loading, error, refresh
// Query: id, heat_start_date, ovulation_date, mating_date, sire_id, expected_whelp_date, actual_whelp_date, status, notes
// Join sire: sire:dogs(id, name)
```

---

## STEP 4 — Update `components/forms/DogForm.tsx`

Add the following new field groups to the existing `DogForm`. Keep the form functional — each field must read from `dog` prop and save correctly via the existing save mechanism.

**Group: Identity (add after name field)**
- `call_name` — TextInput, label "Call Name"
- `location` — TextInput, label "Location / Country"

**Group: Identifiers (new section)**
- `tattoo_number` — TextInput
- `passport_number` — TextInput
- `dna_number` — TextInput, label "DNA Number"
- `insurance_number` — TextInput
- `registration_type` — TextInput, label "Registration Type (e.g. KUSA)"

**Group: Physical (new section)**
- `coat_type` — TextInput (e.g. "Short", "Black & Rust")
- `height_cm` — numeric TextInput, label "Height (cm)"
- `ear_type` — segmented picker: Natural / Cropped / Unknown (maps to `'natural' | 'cropped' | 'unknown'`)
- `eye_colour` — TextInput

**Group: Breeding status (new section)**
- `is_spayed_neutered` — Toggle / Switch, label "Spayed / Neutered"
- `wrights_coi` — numeric TextInput, label "Wright's COI (%)"

Validation rules:
- `height_cm` and `wrights_coi` must parse as valid numbers or be left null
- No field is required in this new section

---

## STEP 5 — Build the Dog Detail Screen Tabs

Create a tab-based navigation for `app/(admin)/dogs/[id]/` using a horizontal scrollable tab bar at the top.

The tabs must be a reusable component: `components/dogs/DogDetailTabs.tsx`

**Tab list:**
1. Overview
2. Health
3. Breeding
4. Shows
5. Documents *(link to existing photos/docs screens)*
6. Gallery *(link to existing photos screen)*

Each tab renders a different panel — all in separate component files under `components/dogs/detail/`:

---

### Tab 1 — Overview: `components/dogs/detail/DogOverviewTab.tsx`

Displays read-only summary + quick-edit button.

Sections:
- **Primary photo** (first is_primary image from dog.media)
- **General** — name, call_name, breed, sex, date_of_birth (calculate age), location
- **Identifiers** — microchip_number, tattoo_number, passport_number, dna_number, insurance_number, registration_number, registration_type
- **Physical** — colour, coat_type, height_cm, ear_type, eye_colour
- **Status** — status badge, category, is_spayed_neutered, is_public, is_featured
- **Genetics** — wrights_coi, genetics_b_locus, genetics_d_locus, genetics_vwd_status, genetics_dcm1_status, genetics_dcm2_status
- **Quick Notes** — temperament_notes, training_notes

Button: "Edit Profile" → navigates to `/(admin)/dogs/[id]/edit`

Use a `SectionCard` component (surface background, gold border, rounded corners) for each group. Show `—` for null/empty fields.

---

### Tab 2 — Health: `components/dogs/detail/DogHealthTab.tsx`

**Four sub-sections, each expandable (accordion):**

#### Vaccinations
- List rows from `useVaccinationsForDog(dogId)`
- Each row: vaccine_name, date_administered, next_due_date, administered_by
- Overdue indicator: if `next_due_date < today`, show a red dot
- "Add Vaccination" → opens a bottom sheet form with: vaccine_name (required), date_administered (required, date), next_due_date (date), administered_by, batch_number, notes
- Swipe left to delete

#### Vet Visits
- List rows from `useVetVisitsForDog(dogId)`
- Each row: visit_date, vet_name or clinic_name, reason
- "Add Visit" → bottom sheet: visit_date (required), vet_name, clinic_name, reason (required), diagnosis, treatment, medications, follow_up_date, cost (numeric), notes
- Swipe left to delete

#### Health Tests
- List rows from `useHealthTests(dogId)`
- Each row: test_name, result, tested_date, lab
- "Add Test" → bottom sheet: test_name (required), result, tested_date (date), lab, notes
- Swipe left to delete

#### Medical Conditions
- List rows from `useMedicalConditions(dogId)`
- Active conditions highlighted with gold border; resolved conditions greyed out
- Each row: condition_name, diagnosed_date, is_active toggle
- "Add Condition" → bottom sheet: condition_name (required), diagnosed_date (date), notes
- Tap row → toggle is_active (resolve / reopen)
- Swipe left to delete

#### Weight Log
- List rows from `useWeightLogs(dogId)` — last 10 entries
- Each row: recorded_date, weight_kg
- "Log Weight" → inline form: weight_kg (numeric, required), recorded_date (defaults today), notes
- Show most recent weight prominently at top of section

---

### Tab 3 — Breeding: `components/dogs/detail/DogBreedingTab.tsx`

**Three sub-sections:**

#### Summary stats (read-only from litters)
Query: `SELECT COUNT(*), SUM(puppy_count) FROM litters WHERE mother_id = dogId OR father_id = dogId`
Show: Total litters, Total puppies produced, Average litter size

#### Heat Cycles (if dog.sex === 'female')
- List from `useHeatCyclesForDog(dogId)`
- Each row: heat_start_date, mating_date, status, expected_whelp_date
- "Add Heat Cycle" → navigate to `/(admin)/heats` (existing screen)

#### Litters
- Query: `litters` where `mother_id = dogId OR father_id = dogId`
- Select: `id, name, status, expected_date, actual_date, puppy_count, available_count, litter_letter`
- Each row: litter name/letter, date, puppy count, status badge
- Tap → navigate to `/(admin)/litters/[id]`

---

### Tab 4 — Shows: `components/dogs/detail/DogShowsTab.tsx`

- List from `useDogShows(dogId)`
- Each row: title, start_date, placement, award
- "Add Show Entry" → bottom sheet form:
  - title (required), location, club, organisation
  - start_date (date, required), end_date (date)
  - placement (e.g. "1st"), award (e.g. "Best of Breed")
  - notes
- Swipe left to delete
- Empty state: "No show records yet. Add your first entry."

---

### Tab 5 — Documents & Gallery

These two tabs simply render two buttons:

```
[Manage Photos & Videos]  →  /(admin)/dogs/[id]/photos
[Edit Pedigree]           →  /(admin)/dogs/[id]/pedigree
[Training Story]          →  /(admin)/dogs/[id]/story
```

No new functionality needed here — these screens already exist.

---

## STEP 6 — Wire the main Dog Detail screen

Update or create `app/(admin)/dogs/[id]/index.tsx` as the entry point for all dog detail tabs.

```typescript
// This screen:
// 1. Fetches the dog using useDog(id)
// 2. Shows a PageHeader with the dog's name
// 3. Renders <DogDetailTabs dogId={id} dog={dog} />
// 4. Handles loading and error states
// Must be under 120 lines
```

The existing `/(admin)/dogs/[id]/edit.tsx` stays as-is (it handles the full edit form).
Navigation from Overview tab "Edit Profile" button goes there.

---

## STEP 7 — Bottom Sheet Pattern

For all "Add" forms in Health, Shows, and Weight tabs, use `@gorhom/bottom-sheet`:

```typescript
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';

// Pattern:
const sheetRef = useRef<BottomSheet>(null);
// Open: sheetRef.current?.expand()
// Close: sheetRef.current?.close()
// On save: call the hook's add function → close sheet → show toast on success/error
```

Date inputs: use `TextInput` with placeholder `YYYY-MM-DD` — no date picker dependency needed. Parse with `new Date(value)` and validate before saving.

---

## STEP 8 — Reusable Components to Create

Create these in `components/dogs/detail/`:

### `SectionCard.tsx`
```typescript
interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}
// Surface background (#1C1A0E), gold border (rgba(196,163,90,0.2)), rounded-xl padding
// Title in gold uppercase label style
// Optional action button top-right
```

### `DetailRow.tsx`
```typescript
interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean; // monospace font for IDs/numbers
}
// Horizontal layout: muted label left, value right
// Shows '—' when value is null/empty
```

### `AccordionSection.tsx`
```typescript
interface AccordionSectionProps {
  title: string;
  count?: number; // shows badge with count
  children: React.ReactNode;
  defaultOpen?: boolean;
}
// Toggle open/closed with animated chevron
// Gold title, count badge
```

### `EmptyTabState.tsx`
```typescript
interface EmptyTabStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

---

## STEP 9 — Toast Feedback

Use Expo's built-in toast or a simple inline `Alert` for success/error feedback on all save operations:

```typescript
import { Alert } from 'react-native';
// On success: Alert.alert('Saved', 'Record saved successfully.')
// On error: Alert.alert('Error', 'Could not save. Please try again.')
```

If the project already uses a toast library (`react-native-toast-message` or similar), use that instead.

---

## File Structure to Create/Modify

```
hooks/
  useDogDetail.ts                  ← NEW — dog_shows, medical_conditions, weight_logs, health_tests
  useHealth.ts                     ← MODIFY — add per-dog versions of existing hooks
  useHeats.ts                      ← MODIFY — add useHeatCyclesForDog(dogId)
  useDogs.ts                       ← MODIFY — update DOG_DETAIL_SELECT

components/
  forms/
    DogForm.tsx                    ← MODIFY — add new field groups
  dogs/
    detail/
      DogDetailTabs.tsx            ← NEW — horizontal tab bar
      DogOverviewTab.tsx           ← NEW
      DogHealthTab.tsx             ← NEW
      DogBreedingTab.tsx           ← NEW
      DogShowsTab.tsx              ← NEW
      SectionCard.tsx              ← NEW
      DetailRow.tsx                ← NEW
      AccordionSection.tsx         ← NEW
      EmptyTabState.tsx            ← NEW

app/
  (admin)/
    dogs/
      [id]/
        index.tsx                  ← NEW — entry point, renders tabs

types/
  app.types.ts                     ← MODIFY — add new Dog fields
```

---

## Critical Rules — Do NOT Violate

1. **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in any client-side code
2. **No file over 300 lines** — split if approaching limit
3. **Every Supabase call must check `.error`** — no silent failures
4. **Every list needs loading, empty, and error states**
5. **All new hooks must accept `dogId: string` as parameter** and only return data for that dog
6. **Do NOT use `SELECT *`** — always specify columns
7. **TypeScript strict** — no `any`, no `as unknown` without a comment
8. **Run `npx tsc --noEmit` at the end** — zero errors allowed

---

## Testing Checklist

Before finishing, verify:

**Data**
- [ ] Opening a dog detail screen loads the dog's name and all fields
- [ ] New columns (call_name, coat_type, ear_type, etc.) appear in Overview tab
- [ ] Adding a vaccination → it appears in the list immediately after save
- [ ] Adding a vet visit → appears in list immediately
- [ ] Adding a show entry → appears in list immediately
- [ ] Adding a health test → appears in list
- [ ] Logging weight → appears in weight list
- [ ] Adding a medical condition → appears, toggleing is_active works
- [ ] Editing profile fields in DogForm and saving → new values appear in Overview
- [ ] Deleting any record removes it from the list

**UX**
- [ ] Each tab renders its own content correctly
- [ ] Bottom sheets open and close properly
- [ ] Loading skeletons show while data fetches
- [ ] Empty states show correct message when no records exist
- [ ] "—" shown for null fields in Overview

**Performance**
- [ ] Each tab only fetches its own data (no over-fetching)
- [ ] Lists use FlatList not .map() for any list > 5 items

**Quality**
- [ ] `npx tsc --noEmit` passes
- [ ] No console errors in Expo terminal
- [ ] No file over 300 lines

---

---

## STEP 10 — Puppy Weight Tracking in Litter Detail

### What this is
Each litter has puppies (dogs linked via `litter_id`). Admins need to log daily weights per puppy and see a growth chart. This matches the DogBreederPro "Breeding Cycles → Litter → Weights" screen.

### How the data works
- Puppies are `dogs` rows where `litter_id = <this litter's id>`
- Weights are stored in the existing `weight_logs` table: `dog_id (puppy), weight_kg (numeric), recorded_date (DATE)`
- `weight_kg` stores decimal values — e.g., `1.129` = 1 kg 129 g
- No new table needed — `weight_logs` already handles this

### Step 10a — Add "Weights" tab to the Litter Detail screen

File: `app/(admin)/litters/[id]/index.tsx`

Currently has tabs: `overview`, `puppies`

Add a third tab: `weights`

```typescript
const [tab, setTab] = useState<'overview' | 'puppies' | 'weights'>('overview');
```

Render `<LitterWeightsTab litterId={id} />` when `tab === 'weights'`

### Step 10b — Create hook: `useLitterWeights(litterId: string)`

Create or add to `hooks/useDogs.ts` (or a new `hooks/useLitterWeights.ts` if it keeps the file under 300 lines):

```typescript
/**
 * useLitterWeights — loads all puppies for a litter and their weight logs.
 * Returns puppies[], weightsByPuppyId Map, all unique dates, refresh, logWeight, deleteWeight.
 */
export function useLitterWeights(litterId: string) {
  // 1. Fetch puppies: SELECT id, name, sex, colour FROM dogs WHERE litter_id = litterId ORDER BY name
  // 2. Fetch weight logs: SELECT id, dog_id, weight_kg, recorded_date, notes
  //    FROM weight_logs WHERE dog_id IN (puppy ids) ORDER BY recorded_date ASC
  // 3. Build a Map<puppyId, WeightLog[]> for easy lookup in the UI

  // logWeight(puppyId, weightKg, date, notes?)
  // → INSERT into weight_logs { dog_id: puppyId, weight_kg, recorded_date: date }
  // → refresh after insert

  // deleteWeight(weightLogId)
  // → DELETE FROM weight_logs WHERE id = weightLogId
  // → refresh after delete
}
```

Return shape:
```typescript
{
  puppies: Array<{ id: string; name: string; sex: string | null; colour: string | null }>;
  weightsByPuppyId: Map<string, Array<{ id: string; weight_kg: number; recorded_date: string; notes: string | null }>>;
  uniqueDates: string[];  // sorted ASC, all distinct dates that have any weight entry
  loading: boolean;
  error: string | null;
  refresh: () => void;
  logWeight: (puppyId: string, weightKg: number, date: string, notes?: string) => Promise<void>;
  deleteWeight: (weightLogId: string) => Promise<void>;
}
```

### Step 10c — Create `components/litters/LitterWeightsTab.tsx`

```typescript
interface LitterWeightsTabProps {
  litterId: string;
}
```

This component renders:

#### 1. Add Weight Entry (inline form at top)

```
Date: [TextInput YYYY-MM-DD, default today]

[For each puppy row:]
Puppy name — [weight_kg TextInput  e.g. "1.129"]   [Log button]
```

Design notes:
- Simple vertical list, one puppy per row
- Weight input: numeric keyboard, placeholder "kg (e.g. 1.250)"
- Tap "Log" for that puppy → calls `logWeight(puppyId, parseFloat(input), date)`
- Show toast / Alert on success
- After any log → refresh
- Parse weight: accept formats like "1.250", "1250" (auto-detect if >100 treat as grams and convert to kg)

#### 2. Weight History Table (per puppy)

Below the entry form, show each puppy as an accordion:

```
▼ Puppy 1 (Black) — ♀
  Date          Weight
  17 Jun 2026   1.129 kg
  18 Jun 2026   1.189 kg
  19 Jun 2026   1.215 kg     [× delete]
  ...
```

Use `FlatList` inside each accordion section.
Swipe left OR a trash icon to delete a weight entry (calls `deleteWeight(id)`).

#### 3. Growth Chart (one line per puppy)

Use `react-native-svg-charts` OR a simple SVG line chart.

**If `react-native-svg-charts` is NOT installed**, build a minimal SVG line chart inline using React Native's `Svg`, `Path`, `Line`, `Text` from `react-native-svg` (which Expo includes).

Chart spec:
- X axis: dates (show abbreviated: "17 Jun", "18 Jun")
- Y axis: weight in kg
- One coloured line per puppy
- Dots at each data point
- Puppy name labels or a legend below the chart
- Chart height: 200px, full width minus 32px padding
- If only 1 data point exists, show a single dot (no line)
- If no data, show "No weights recorded yet"

Chart is rendered below the accordion sections.

#### File size warning
If `LitterWeightsTab.tsx` approaches 300 lines, extract the chart into `components/litters/PuppyGrowthChart.tsx` and the weight entry form into `components/litters/WeightEntryForm.tsx`.

### Step 10d — Weight display format

Store and retrieve as decimal kg. Display in the UI as:
```typescript
function formatWeight(kg: number): string {
  const wholeKg = Math.floor(kg);
  const grams = Math.round((kg - wholeKg) * 1000);
  if (wholeKg === 0) return `${grams} g`;
  if (grams === 0) return `${wholeKg} kg`;
  return `${wholeKg} kg ${grams} g`;
}
// 1.129 → "1 kg 129 g"
// 0.850 → "850 g"
// 2.000 → "2 kg"
```

Put this function in `lib/kennel/formatters.ts` (file already exists).

### Step 10e — Empty and loading states

- Loading: show a skeleton with 3 puppy rows
- No puppies in litter: "No puppies recorded in this litter yet. Add puppies first."
- Puppies exist but no weights: "No weights logged yet. Use the form above to start tracking."

---

## Updated File List (additions for Step 10)

```
hooks/
  useLitterWeights.ts              ← NEW (or added to useDogs.ts if space allows)

components/
  litters/
    LitterWeightsTab.tsx           ← NEW — weight entry + history + chart
    PuppyGrowthChart.tsx           ← NEW (extracted if LitterWeightsTab > 250 lines)
    WeightEntryForm.tsx            ← NEW (extracted if needed)

lib/
  kennel/
    formatters.ts                  ← MODIFY — add formatWeight(kg) function

app/
  (admin)/
    litters/
      [id]/
        index.tsx                  ← MODIFY — add 'weights' tab + render LitterWeightsTab
```

---

## Updated Testing Checklist (additions for Step 10)

- [ ] Litter detail screen shows 3 tabs: Overview, Puppies, Weights
- [ ] Weights tab loads all puppies for the litter
- [ ] Entering a weight and tapping Log → weight appears in that puppy's history
- [ ] Weight displayed as "1 kg 129 g" format
- [ ] Deleting a weight entry removes it from the list
- [ ] Growth chart shows lines for puppies that have 2+ weight entries
- [ ] Chart shows a dot (not a line) for puppies with only 1 entry
- [ ] Empty state shown when no puppies or no weights
- [ ] `formatWeight` in formatters.ts passes: 1.129 → "1 kg 129 g", 0.85 → "850 g"

---

## Execution Order

1. Run `npx supabase gen types typescript` first
2. Update `types/app.types.ts` — Dog type
3. Update `hooks/useDogs.ts` — DOG_DETAIL_SELECT
4. Create `hooks/useDogDetail.ts` — new hooks
5. Update `hooks/useHealth.ts` — per-dog functions
6. Update `hooks/useHeats.ts` — per-dog function
7. Create all components in `components/dogs/detail/`
8. Update `components/forms/DogForm.tsx` — new fields
9. Create `app/(admin)/dogs/[id]/index.tsx`
10. Run tsc and fix all errors
11. Test each tab manually
