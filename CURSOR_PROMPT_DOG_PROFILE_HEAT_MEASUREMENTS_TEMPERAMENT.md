# Cursor Prompt — Heat Cycles, Measurements, Breed Standards & Temperament Evaluation

## Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

## What We Are Building

This prompt adds four interconnected features to individual dog profiles:

1. **Heat quick-entry** — female-only banner/card; records heat start date and displays the mating window on-profile
2. **Mating capture** — record the first mating date on the active heat so the system calculates the expected whelping ETA
3. **Measurements + Breed Standard Selector** — height, body length, chest; each dog is tagged to either **KUSA/FCI (European)** or **AKC (American)** standard, matching their actual bloodline
4. **Temperament self-evaluation** — 8-dimension scored assessment (ZTP-based for European; DPCA/AKC adapted for American), visible grade per dog

---

## MIGRATION 0020 — Apply First

File: `supabase/migrations/0020_dog_measurements_temperament.sql`

```sql
-- =============================================================
-- 0020 — Dog measurements, breed standard, bloodline, temperament
-- =============================================================

-- ── Breed standard & bloodline ──────────────────────────────
ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS standard        text DEFAULT 'fci_kusa'
    CHECK (standard IN ('fci_kusa', 'akc')),
  ADD COLUMN IF NOT EXISTS bloodline_type  text DEFAULT 'european'
    CHECK (bloodline_type IN ('european', 'american', 'mixed')),

-- ── Physical measurements (metric — centimetres) ────────────
  ADD COLUMN IF NOT EXISTS height_cm       numeric(5,1),   -- withers (floor to shoulder blade top)
  ADD COLUMN IF NOT EXISTS body_length_cm  numeric(5,1),   -- point of shoulder to point of buttock
  ADD COLUMN IF NOT EXISTS chest_depth_cm  numeric(5,1),   -- withers to sternum
  ADD COLUMN IF NOT EXISTS chest_girth_cm  numeric(5,1);   -- circumference at deepest point

-- ── Temperament evaluations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dog_temperament_scores (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id                     uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  assessed_by                uuid REFERENCES auth.users(id),
  assessed_at                date NOT NULL DEFAULT CURRENT_DATE,
  evaluation_standard        text NOT NULL DEFAULT 'fci_ztp'
    CHECK (evaluation_standard IN ('fci_ztp', 'akc_dpca')),

  -- 8 scored dimensions (1–10 each, max 80 total)
  nerve_stability            int CHECK (nerve_stability BETWEEN 1 AND 10),
  drive_and_energy           int CHECK (drive_and_energy BETWEEN 1 AND 10),
  courage                    int CHECK (courage BETWEEN 1 AND 10),
  hardness                   int CHECK (hardness BETWEEN 1 AND 10),
  environmental_confidence   int CHECK (environmental_confidence BETWEEN 1 AND 10),
  working_willingness        int CHECK (working_willingness BETWEEN 1 AND 10),
  social_behavior            int CHECK (social_behavior BETWEEN 1 AND 10),
  obedience                  int CHECK (obedience BETWEEN 1 AND 10),

  -- Total stored for fast querying
  total_score                int GENERATED ALWAYS AS (
    COALESCE(nerve_stability, 0) +
    COALESCE(drive_and_energy, 0) +
    COALESCE(courage, 0) +
    COALESCE(hardness, 0) +
    COALESCE(environmental_confidence, 0) +
    COALESCE(working_willingness, 0) +
    COALESCE(social_behavior, 0) +
    COALESCE(obedience, 0)
  ) STORED,

  notes                      text,
  created_at                 timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_temperament_dog_id ON dog_temperament_scores(dog_id);
CREATE INDEX IF NOT EXISTS idx_temperament_assessed_at ON dog_temperament_scores(assessed_at DESC);

-- RLS
ALTER TABLE dog_temperament_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and above can read temperament scores"
  ON dog_temperament_scores FOR SELECT
  USING (is_trainer_or_above());

CREATE POLICY "Admins can insert temperament scores"
  ON dog_temperament_scores FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update temperament scores"
  ON dog_temperament_scores FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete temperament scores"
  ON dog_temperament_scores FOR DELETE
  USING (is_admin());
```

**Apply this migration, then regenerate types:**
```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts
```

---

## BREED STANDARD DATA — Embed in Constants File

Create `lib/dogs/breedStandards.ts`:

```ts
export type BreedStandard = 'fci_kusa' | 'akc'
export type BloodlineType = 'european' | 'american' | 'mixed'

export interface StandardRange {
  min: number
  max: number
  ideal?: number
  unit: string
}

export interface BreedStandardSpec {
  label: string
  bloodlineNote: string
  heightMale: StandardRange
  heightFemale: StandardRange
  weightMale: StandardRange
  weightFemale: StandardRange
  bodyRatioMale: string   // body length vs height
  bodyRatioFemale: string
  chestDepthNote: string
  earNote: string
  tailNote: string
  measurementInstructions: {
    height: string
    bodyLength: string
    chestDepth: string
    chestGirth: string
    weight: string
  }
}

export const BREED_STANDARDS: Record<BreedStandard, BreedStandardSpec> = {
  fci_kusa: {
    label: 'KUSA / FCI Standard (European)',
    bloodlineNote:
      'European Dobermanns are bred to FCI Standard N° 143, translated and adopted by KUSA (Dobermann Council of South Africa). Emphasises elegant working dog conformation. Natural ears and tail. ZTP suitability test required for breeding animals.',
    heightMale:   { min: 68, max: 72, ideal: 70, unit: 'cm' },
    heightFemale: { min: 63, max: 68, ideal: 65, unit: 'cm' },
    weightMale:   { min: 40, max: 45, unit: 'kg' },
    weightFemale: { min: 32, max: 35, unit: 'kg' },
    bodyRatioMale:   'Body length ≤ 105% of wither height',
    bodyRatioFemale: 'Body length ≤ 110% of wither height',
    chestDepthNote: 'Chest depth approximately 50% of wither height',
    earNote: 'Natural ears (uncropped) preferred under FCI/KUSA',
    tailNote: 'Natural tail (undocked) preferred under FCI/KUSA',
    measurementInstructions: {
      height:
        'Stand dog squarely on a flat surface. Measure vertically from the ground to the highest point of the withers (top of shoulder blades). Use a wicket or measuring stick.',
      bodyLength:
        'Measure horizontally from the point of the shoulder (front of upper arm/shoulder joint) to the point of the buttock (rearmost point of pelvis). Keep tape parallel to the ground.',
      chestDepth:
        'Measure vertically from the highest point of the withers down to the lowest point of the sternum (brisket). Should be approximately half the wither height.',
      chestGirth:
        'Wrap a flexible tape measure around the deepest part of the chest, directly behind the front legs. Record the circumference.',
      weight:
        'Weigh on a calibrated scale. For large dogs: weigh yourself holding the dog, then subtract your own weight. Record in kilograms.',
    },
  },
  akc: {
    label: 'AKC Standard (American)',
    bloodlineNote:
      'American Doberman Pinschers are bred to the AKC standard. American lines tend towards a heavier, more powerful build with broader heads. Cropped ears and docked tail are traditional in the USA. The Doberman Pinscher Club of America (DPCA) administers temperament certifications.',
    heightMale:   { min: 66, max: 71, ideal: 69, unit: 'cm' }, // 26–28 in
    heightFemale: { min: 61, max: 66, ideal: 64, unit: 'cm' }, // 24–26 in
    weightMale:   { min: 34, max: 45, unit: 'kg' }, // 75–100 lbs
    weightFemale: { min: 27, max: 41, unit: 'kg' }, // 60–90 lbs
    bodyRatioMale:   'Square build preferred — length approximately equal to height',
    bodyRatioFemale: 'Slightly longer than tall permitted for females',
    chestDepthNote: 'Broad, deep chest reaching to the elbow',
    earNote: 'Cropped ears traditional under AKC standard',
    tailNote: 'Docked tail traditional under AKC standard',
    measurementInstructions: {
      height:
        'Stand dog squarely on a flat surface. Measure vertically from the ground to the top of the withers (highest point of shoulder blades). Record in centimetres.',
      bodyLength:
        'Measure from the point of the breastbone (prosternum) to the rear of the upper thigh. The AKC ideal is a square dog, so this should approximate wither height.',
      chestDepth:
        'Measure from the top of the withers to the deepest point of the chest. The brisket should reach approximately to the elbow.',
      chestGirth:
        'Wrap a flexible tape around the chest at the widest point behind the front legs. Record the circumference in centimetres.',
      weight:
        'Weigh on a calibrated scale. Record in kilograms (divide pounds by 2.205).',
    },
  },
}

// Grading for temperament scores (applies to both standards — 8 dimensions, 10 pts each = 80 max)
export const TEMPERAMENT_GRADES = [
  { label: 'Excellent', minScore: 70, color: '#C4A35A' },
  { label: 'Good',      minScore: 55, color: '#7EB77F' },
  { label: 'Adequate',  minScore: 40, color: '#E8A838' },
  { label: 'Poor',      minScore: 0,  color: '#C24E4E' },
] as const

export function getTemperamentGrade(totalScore: number) {
  return TEMPERAMENT_GRADES.find((g) => totalScore >= g.minScore) ?? TEMPERAMENT_GRADES[3]
}
```

---

## TASK 1 — `DogStandardPanel` Component

**File:** `components/dogs/detail/DogStandardPanel.tsx`

This panel appears in `DogOverviewTab` and lets admin select which **breed standard** and **bloodline type** apply to this individual dog. Keep under 100 lines.

```
╔════════════════════════════════════════╗
║  BREED STANDARD & BLOODLINE            ║
║                                        ║
║  Standard:                             ║
║  [● KUSA / FCI (European)]  [○ AKC]   ║
║                                        ║
║  Bloodline:                            ║
║  [● European]  [○ American]  [○ Mixed] ║
║                                        ║
║  ℹ European Dobermanns are bred to    ║
║    FCI Standard N° 143 (KUSA)...       ║
╚════════════════════════════════════════╝
```

**Props:**
```ts
interface DogStandardPanelProps {
  dog: Dog          // needs dog.id, dog.standard, dog.bloodline_type
  canEdit: boolean  // true for admin, false for trainer/viewer
  onSaved: () => void
}
```

**Behaviour:**
- Display current standard and bloodline as selected chip options
- `canEdit` = true: chips are tappable and save immediately on tap via `supabase.from('dogs').update()`
- `canEdit` = false: display-only, chips not pressable
- Show the `bloodlineNote` from `BREED_STANDARDS[standard]` in a small italic caption below

---

## TASK 2 — `DogMeasurementsPanel` Component

**File:** `components/dogs/detail/DogMeasurementsPanel.tsx`

Displays and edits the four physical measurements. References the correct benchmark from `BREED_STANDARDS` based on the dog's `standard` and `sex`. Max 150 lines — split into sub-components if needed.

### Layout:
```
╔════════════════════════════════════════════════════════╗
║  PHYSICAL MEASUREMENTS                    [Edit]       ║
║  Standard: KUSA / FCI (European)                       ║
╠════════════════════════════════════════════════════════╣
║  WITHERS HEIGHT       Standard: 68–72 cm (ideal 70)   ║
║  ─────────────────────────────────────────────────     ║
║  Recorded: 70.5 cm         [●●●●●●●●●○] 70.5/72      ║
║  📏 How to measure: Stand dog squarely on flat...     ║
║                                                        ║
║  BODY LENGTH          Standard: ≤ 105% of height      ║
║  Recorded: 72.0 cm  (ratio: 102%)   ✅ Within range   ║
║                                                        ║
║  CHEST DEPTH          Standard: ~50% of height        ║
║  Recorded: 35.2 cm  (50.0%)         ✅ Within range   ║
║                                                        ║
║  CHEST GIRTH                                          ║
║  Recorded: 78.0 cm                                    ║
╚════════════════════════════════════════════════════════╝
```

### Benchmark comparison logic:

```ts
function evalHeight(heightCm: number, standard: BreedStandard, sex: 'male' | 'female') {
  const spec = BREED_STANDARDS[standard]
  const range = sex === 'male' ? spec.heightMale : spec.heightFemale
  if (heightCm < range.min) return { status: 'below', label: 'Below standard' }
  if (heightCm > range.max) return { status: 'above', label: 'Above standard' }
  if (range.ideal && Math.abs(heightCm - range.ideal) <= 1) return { status: 'ideal', label: 'Ideal' }
  return { status: 'within', label: 'Within standard' }
}
// Same pattern for weight
// Body ratio: (bodyLength / height) * 100 — compare to spec.bodyRatioNote
// Chest depth: (chestDepth / height) * 100 — compare to spec.chestDepthNote
```

### Status indicator colours:
- `ideal` → Gold `#C4A35A`
- `within` → Green `#7EB77F`
- `below` / `above` → Amber `#E8A838`

### Edit mode:
- Tapping **[Edit]** opens a bottom sheet (`@gorhom/bottom-sheet`)
- 4 `TextInput` fields (numeric keyboard): Height, Body Length, Chest Depth, Chest Girth
- Show the measurement instruction (from `breedStandards.ts`) as a grey helper text under each field
- Save button: `supabase.from('dogs').update({ height_cm, body_length_cm, chest_depth_cm, chest_girth_cm })`
- Validate: all values must be numeric > 0 if provided

---

## TASK 3 — Heat Status Panel on Female Profiles

**File:** `components/dogs/detail/HeatStatusCard.tsx`

Only rendered when `dog.sex === 'female'`. Uses existing hooks — do NOT create duplicate hooks.

**Import existing:**
```ts
import { useActiveHeat } from '@/hooks/useHeatCycles'
import { useNextPredictedHeat } from '@/hooks/useHeatCycles'
import { autoHeatDates } from '@/lib/heats/calculations'
```

### State A — No active heat:

```
╔════════════════════════════════════════╗
║  HEAT & BREEDING CYCLE                 ║
║                                        ║
║  Status: No active heat                ║
║  Next predicted heat: ~15 Dec 2026     ║
║                                        ║
║  [+ Record Heat Start Date]            ║
╚════════════════════════════════════════╝
```

**"Record Heat Start Date" flow:**
1. Tap opens a `DateTimePicker` modal (date only, no future dates)
2. On confirm: call `supabase.from('heat_cycles').insert({ dog_id, heat_start_date: selectedDate, is_predicted: false, status: 'active' })`
3. The existing `auto_calculate_heat_dates()` DB trigger fires automatically and populates `proestrus_start_date`, `estrus_start_date`, `ovulation_date`, `expected_whelp_date`
4. Refresh `useActiveHeat(dog.id)` — card transitions to State B

### State B — Active heat in progress:

```
╔════════════════════════════════════════╗
║  🔴 ACTIVE HEAT                        ║
║                                        ║
║  Heat started:    12 Oct 2026          ║
║  Proestrus ends:  21 Oct 2026          ║
║                                        ║
║  ┌─ MATING WINDOW ─────────────────┐  ║
║  │  Opens:   23 Oct (Day 11)       │  ║
║  │  Optimal: 23–29 Oct             │  ║
║  │  Closes:  30 Oct (Day 19)       │  ║
║  └─────────────────────────────────┘  ║
║                                        ║
║  Mating recorded: Not yet             ║
║  [✎ Record First Mating Date]         ║
║                                        ║
║  Expected whelping (if mated today):  ║
║  ~14 Jan 2027  (63 days)              ║
╚════════════════════════════════════════╝
```

**Date calculations (use existing `autoHeatDates()` values from the heat_cycle record):**
- `proestrus_start_date` = heat_start_date (day 0)
- `estrus_start_date` = heat_start_date + 9 days (mating window opens)
- `ovulation_date` = heat_start_date + 11 days (optimal start)
- Mating window closes: heat_start_date + 19 days (estrus ~10 days, ovulation at day 11)
- `expected_whelp_date` = mating_date + 63 days (when mating is recorded)

**"Record First Mating Date" flow:**
1. Opens DateTimePicker (date only)
2. On confirm: `supabase.from('heat_cycles').update({ mating_date: selectedDate }).eq('id', activeHeat.id)`
3. Show confirmation with ETA: "Mating recorded ✓  Expected whelping: [date]"
4. Card State B updates to show the mating date and ETA

### State C — Active heat + mating recorded:

```
╔════════════════════════════════════════╗
║  🟡 IN WHELP                           ║
║                                        ║
║  Mated:           23 Oct 2026          ║
║  Sire:            Zeus v.d. Graften    ║
║  Expected whelp:  24 Jan 2027          ║
║  Days remaining:  47 days              ║
║                                        ║
║  Go home window:  6–13 Mar 2027        ║
║  (8 weeks from whelp)                  ║
╚════════════════════════════════════════╝
```

**Sire name:** join `heat_cycles.sire_id → dogs.name`. If sire_id is null, show "Sire not recorded" with an [Add Sire] link that navigates to the heat edit form.

**Calendar events:** After recording a mating date, call the existing `sync_heat_to_calendar()` DB trigger which should already create calendar events. If the trigger does not exist for this, insert into `calendar_events`:
```ts
await supabase.from('calendar_events').insert([
  { title: `${dog.name} — Mating Window Opens`, start_date: estrusStartDate, type: 'heat' },
  { title: `${dog.name} — Expected Whelping`, start_date: expectedWhelpDate, type: 'heat' },
  { title: `${dog.name} — Go Home Opens`, start_date: goHomeEarliest, type: 'litter' },
])
```

---

## TASK 4 — Weight Entry on Dog Profiles

**File:** `components/dogs/detail/DogWeightPanel.tsx`

The `weight_logs` table already exists with `dog_id`, `weight_grams`, `recorded_at`, `session` columns. This panel shows current weight and allows entry. Separate from litter puppy weight tracking.

### Layout:
```
╔════════════════════════════════════════╗
║  WEIGHT TRACKING                       ║
║                                        ║
║  Latest: 40.2 kg  (recorded 12 Jun)   ║
║  Standard range: 40–45 kg (male)      ║
║  Status: ✅ Within KUSA/FCI standard   ║
║                                        ║
║  [+ Log Weight]                        ║
╚════════════════════════════════════════╝
```

**Query:** `weight_logs` where `dog_id = dog.id AND session IS NULL` (null session = adult dog weight, not puppy twice-daily). Order by `recorded_at DESC`, take the first record.

**"Log Weight" flow:**
- Opens bottom sheet with a single numeric input (kg, one decimal place)
- Converts to grams: `Math.round(kgValue * 1000)`
- Insert: `{ dog_id, weight_grams, recorded_at: new Date().toISOString(), session: null }`

**Benchmark comparison:** Use `BREED_STANDARDS[dog.standard].weightMale/weightFemale` for the comparison. Display status same as measurements (ideal/within/below/above).

---

## TASK 5 — Temperament Self-Evaluation

**File:** `components/dogs/detail/DogTemperamentTab.tsx`  
(This becomes the 6th tab in `DogDetailTabs`)

### Evaluation standards:

```ts
export const TEMPERAMENT_DIMENSIONS: Record<string, {
  key: string
  label: string
  labelDE: string       // German ZTP term (shown for fci_ztp)
  description: string
  ficGuide: string      // what a high score looks like (FCI/KUSA)
  akcGuide: string      // what a high score looks like (AKC/DPCA)
}> = {
  nerve_stability: {
    key: 'nerve_stability',
    label: 'Nerve Stability',
    labelDE: 'Nervenfestigkeit',
    description: 'Calmness under unusual stimuli — traffic, crowds, sudden noises, unexpected objects.',
    ficGuide: '10 = Dog shows no stress reaction to unfamiliar stimuli. Composed, curious, unshaken.',
    akcGuide: '10 = Dog ignores distractions, does not startle or react to environmental stimuli.',
  },
  drive_and_energy: {
    key: 'drive_and_energy',
    label: 'Drive & Energy',
    labelDE: 'Triebveranlagung',
    description: 'Prey drive, play drive, retrieve motivation. The desire to engage and pursue.',
    ficGuide: '10 = Explosive, highly motivated pursuit. Strong ball/toy drive. Intense engagement.',
    akcGuide: '10 = Enthusiastic, motivated worker with high energy and sustained drive.',
  },
  courage: {
    key: 'courage',
    label: 'Courage',
    labelDE: 'Mut',
    description: 'Willingness to confront adversity, unusual objects, or threatening stimuli without retreating.',
    ficGuide: '10 = Dog advances confidently on threat/unfamiliar object. No hesitation or avoidance.',
    akcGuide: '10 = Bold, fearless, advances under pressure without handler intervention.',
  },
  hardness: {
    key: 'hardness',
    label: 'Hardness / Recovery',
    labelDE: 'Härte',
    description: 'Speed of recovery after a stressful or startling experience. Hard dogs bounce back quickly.',
    ficGuide: '10 = Immediate recovery. Dog shakes it off within seconds, re-engages without prompting.',
    akcGuide: '10 = Fast recovery. Dog self-corrects and re-focuses without handler reassurance.',
  },
  environmental_confidence: {
    key: 'environmental_confidence',
    label: 'Environmental Confidence',
    labelDE: 'Umweltsicherheit',
    description: 'Confidence in new environments, unfamiliar surfaces, sounds, vehicles, and public spaces.',
    ficGuide: '10 = Dog moves freely in all environments. No avoidance, no stress. Curious and stable.',
    akcGuide: '10 = CGC-level confidence in public. Calm on all surfaces, traffic, buildings, elevators.',
  },
  working_willingness: {
    key: 'working_willingness',
    label: 'Working Willingness',
    labelDE: 'Arbeitswille',
    description: 'Desire to engage in structured tasks, training, and problem-solving with the handler.',
    ficGuide: '10 = Dog actively seeks work. Intense focus, no coaxing needed. Excellent task persistence.',
    akcGuide: '10 = Dog engages enthusiastically in obedience/sport tasks. Focused, persistent, willing.',
  },
  social_behavior: {
    key: 'social_behavior',
    label: 'Social Behavior',
    labelDE: 'Sozialverhalten',
    description: 'Appropriate behavior with unfamiliar people and other dogs. Neither aggressive nor avoidant.',
    ficGuide: '10 = Dog is neutral with strangers, non-reactive with dogs, no unjustified aggression.',
    akcGuide: '10 = Friendly or neutral with strangers. Appropriate with other dogs. No reactivity.',
  },
  obedience: {
    key: 'obedience',
    label: 'Obedience & Handler Bond',
    labelDE: 'Gehorsamkeit',
    description: 'Response to commands, handler focus, reliability under distraction.',
    ficGuide: '10 = Immediate response to all commands under full distraction. Dog watches handler.',
    akcGuide: '10 = AKC obedience-standard reliability. Fast response, attentive, performs in public.',
  },
}
```

### Tab layout:

```
╔══════════════════════════════════════════════════════════╗
║  TEMPERAMENT EVALUATION                                  ║
║  Standard: [● ZTP / FCI-KUSA (European)]  [○ AKC/DPCA] ║
║                                                          ║
║  Last assessed: 10 Jun 2026 by Matt D.                  ║
║  Total score: 62 / 80    Grade: GOOD  ████████░░        ║
║                                                          ║
║  [+ New Evaluation]                                      ║
╠══════════════════════════════════════════════════════════╣
║  NERVE STABILITY              Nervenfestigkeit           ║
║  ████████░░  8 / 10                                      ║
║  Calmness under unusual stimuli...                       ║
║                                                          ║
║  DRIVE & ENERGY               Triebveranlagung           ║
║  ███████░░░  7 / 10                                      ║
║  ...                                                     ║
╚══════════════════════════════════════════════════════════╝
```

### Evaluation form (bottom sheet):

- Standard selector at top (ZTP / FCI-KUSA or AKC/DPCA)
- For each of the 8 dimensions:
  - Dimension label + German term (if ZTP standard)
  - 1-sentence description
  - Slider 1–10 with current value displayed
  - Small italic guide text showing what a 10 looks like for selected standard
- Notes field (optional)
- "Save Evaluation" button
- On save: `supabase.from('dog_temperament_scores').insert({...})`
- Show calculated total and grade immediately on save (compute in app from sum of 8 scores)

### Grade display:
```ts
// Compute grade on client (GENERATED column in DB stores total_score)
const GRADES = [
  { min: 70, label: 'EXCELLENT', color: '#C4A35A' },
  { min: 55, label: 'GOOD',      color: '#7EB77F' },
  { min: 40, label: 'ADEQUATE',  color: '#E8A838' },
  { min: 0,  label: 'POOR',      color: '#C24E4E' },
]
```

### History:
Below the latest score, show a collapsible "Previous Evaluations" list — date, total score, grade badge per row. Max 5 shown, "View all" link.

### Hook:
Create `hooks/useDogTemperament.ts`:
```ts
// Fetches all scores for a dog, newest first
// Returns: { scores, loading, error, refresh, saveScore }
// saveScore(payload) inserts and refreshes
```

---

## TASK 6 — Wire Everything into the Dog Profile

### In `DogDetailTabs.tsx`:

Add **TEMPERAMENT** as a new tab (6th tab):
```tsx
{ key: 'temperament', label: 'Temperament', icon: 'brain' }
// Renders: <DogTemperamentTab dog={dog} canEdit={isAdmin} />
```

### In `DogOverviewTab.tsx`:

Add these panels in this order (after DogStatusPanel, before General section):

1. `<DogStandardPanel dog={dog} canEdit={isAdmin} onSaved={onRefresh} />`
2. `<HeatStatusCard dog={dog} onRefresh={onRefresh} />` — only when `dog.sex === 'female'`
3. `<DogMeasurementsPanel dog={dog} canEdit={isAdmin} onSaved={onRefresh} />`
4. `<DogWeightPanel dog={dog} canEdit={isAdmin} onSaved={onRefresh} />`

`DogOverviewTab` already receives `onRefresh` (from CURSOR_PROMPT_DOG_STATUS_FIX). Thread it through.

### In `DogBreedingTab.tsx`:

No changes needed for this prompt. The `HeatStatusCard` handles mating capture. The breeding tab will be enhanced in a later prompt.

---

## FILE STRUCTURE

```
supabase/migrations/
  0020_dog_measurements_temperament.sql    ← APPLY FIRST

lib/dogs/
  breedStandards.ts                        ← CREATE (Task constants)

hooks/
  useDogTemperament.ts                     ← CREATE (Task 5)

components/dogs/detail/
  DogStandardPanel.tsx                     ← CREATE (Task 1)  ~100 lines
  DogMeasurementsPanel.tsx                 ← CREATE (Task 2)  ~150 lines
  HeatStatusCard.tsx                       ← CREATE (Task 3)  ~200 lines
  DogWeightPanel.tsx                       ← CREATE (Task 4)  ~100 lines
  DogTemperamentTab.tsx                    ← CREATE (Task 5)  ~250 lines
  DogOverviewTab.tsx                       ← ADD 4 new panels (Task 6)
  DogDetailTabs.tsx                        ← ADD Temperament tab (Task 6)
```

---

## CRITICAL WARNINGS

1. **Do NOT create a new `useHeatCycles` hook** — it already exists at `hooks/useHeatCycles.ts`. Import from there.
2. **Do NOT create a new `useBreedingDogs` hook** — check if it already exists before creating.
3. **`weight_logs.session`** — adult dog weight entries use `session: null`. Puppy entries use `'AM'` or `'PM'`. Query adult weights with `.is('session', null)`.
4. **The `auto_calculate_heat_dates()` trigger is already wired** — you do NOT need to call `autoHeatDates()` manually after inserting a heat_cycle record. The DB trigger fires and populates the date fields. Just re-fetch after insert.
5. **AKC measurements are in inches in the original standard** — the `breedStandards.ts` file above already converts to cm. Use centimetres throughout the app.
6. **Temperament total_score** is a `GENERATED ALWAYS` column — do NOT attempt to insert/update it directly. It is computed automatically from the 8 dimension columns.
7. **Grade is NOT stored in the DB** — compute it in the app from `total_score` using the `GRADES` array. Do not add a `grade` column.
8. **No file over 300 lines.** `DogTemperamentTab.tsx` will be large — extract the evaluation form into `components/dogs/detail/TemperamentEvaluationSheet.tsx` and the dimension display into `TemperamentDimensionRow.tsx`.
9. `npx tsc --noEmit` must pass before this task is marked complete.

---

## TESTING CHECKLIST

### Migration & Types
- [ ] `0020_dog_measurements_temperament.sql` applies with no errors
- [ ] `dog_temperament_scores` table exists with `total_score` GENERATED column
- [ ] `dogs.standard`, `dogs.bloodline_type`, `dogs.height_cm`, `dogs.body_length_cm`, `dogs.chest_depth_cm`, `dogs.chest_girth_cm` columns exist
- [ ] TypeScript types regenerated successfully

### Breed Standard Panel (Task 1)
- [ ] Admin can switch a dog between KUSA/FCI and AKC — saves to DB
- [ ] Admin can switch bloodline (European / American / Mixed) — saves to DB
- [ ] Bloodline note caption updates when standard changes
- [ ] Non-admin sees display-only chips (no press handler)

### Measurements Panel (Task 2)
- [ ] Height benchmark shows correct range for male vs female and selected standard
- [ ] Body ratio calculates and displays correctly when height + body_length both filled
- [ ] Chest depth percentage of height calculates correctly
- [ ] Status indicators: ideal = gold, within = green, outside = amber
- [ ] Edit bottom sheet opens, numeric keyboard on all fields
- [ ] Measurement instructions shown under each input
- [ ] Save updates DB, panel refreshes with new values
- [ ] Empty measurement shows "Not recorded" — no crash

### Heat Status Card (Task 3)
- [ ] Female dog with no heat: shows "No active heat" + "Record Heat Start" button
- [ ] Male dog: HeatStatusCard not rendered at all
- [ ] Recording heat start date inserts heat_cycle with is_predicted=false, status='active'
- [ ] After insert: card transitions to State B showing mating window dates
- [ ] Mating window dates correct: opens on day 11, closes on day 19 from heat_start
- [ ] "Record First Mating Date" inserts mating_date, card transitions to State C
- [ ] State C shows ETA (mating_date + 63 days) and go-home window (ETA + 56–63 days)
- [ ] If sire_id is set, shows sire name; if null, shows "Sire not recorded" + Add Sire link
- [ ] Calendar events inserted after mating date recorded

### Weight Panel (Task 4)
- [ ] Latest adult weight shows correctly (session IS NULL query)
- [ ] Weight benchmark uses correct standard + sex range from breedStandards.ts
- [ ] Log Weight bottom sheet: kg input, converts to grams, inserts with session=null
- [ ] After save, panel refreshes and shows new weight + status

### Temperament Tab (Task 5)
- [ ] Sixth tab visible in DogDetailTabs as "Temperament"
- [ ] No previous evaluations: shows empty state with [+ New Evaluation] button
- [ ] New Evaluation bottom sheet: standard selector at top changes guide text per dimension
- [ ] ZTP standard: German dimension labels shown
- [ ] AKC/DPCA standard: English-only labels shown, AKC guide text
- [ ] Sliders 1–10 work, total score updates live
- [ ] Save inserts record, tab refreshes showing new score + grade
- [ ] Grade badge: Excellent (gold), Good (green), Adequate (amber), Poor (red)
- [ ] Progress bar fills proportionally to 80-point scale
- [ ] Previous evaluations list shows below, newest first
- [ ] `total_score` GENERATED column populated by DB — not written by app

### Integration
- [ ] DogOverviewTab renders all 4 new panels in correct order
- [ ] HeatStatusCard only shown for female dogs
- [ ] `onRefresh` flows through correctly — status changes, standard changes, weight saves all refresh the parent screen
- [ ] `npx tsc --noEmit` passes with zero errors
