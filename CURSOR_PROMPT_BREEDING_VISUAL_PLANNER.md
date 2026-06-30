# Cursor Prompt — Visual Breeding Planner (Two-Line Genetic Programme)

## Stack Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- SVG: use `react-native-svg` (already in Expo — `import Svg, { Line, Path, Circle } from 'react-native-svg'`)
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

---

## What We Are Building

A **visual genetic breeding planner** for two permanent bloodlines that are self-sustaining — no outside blood is ever purchased again. The planner shows:

- Males as **side-by-side columns** with their photo and line badge
- Females **allocated under their primary male** with photo and health status
- **SVG lines drawn** connecting each planned pairing (female → male) with a COI % badge on the line
- **Colour-coded lines:** green < 3% | amber 3–5% | red > 5% (risk threshold)
- As real pairings happen, they are marked complete and the plan regenerates for the next generation
- Everything is calculated from actual pedigree data (sire_id / dam_id chain in the dogs table)

---

## STEP 1 — Database: Pedigree Depth

The existing `dogs` table has `sire_id` and `dam_id`. For COI calculation we need to traverse 4 generations. Create a Supabase database function to return a flat ancestor list:

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_ancestors(p_dog_id uuid, p_depth int DEFAULT 4)
RETURNS TABLE(ancestor_id uuid, depth int, path text) AS $$
WITH RECURSIVE ancestry AS (
  SELECT
    d.sire_id AS ancestor_id, 1 AS depth, 'sire' AS path
  FROM dogs d WHERE d.id = p_dog_id AND d.sire_id IS NOT NULL
  UNION ALL
  SELECT
    d.dam_id, 1, 'dam'
  FROM dogs d WHERE d.id = p_dog_id AND d.dam_id IS NOT NULL
  UNION ALL
  SELECT
    d.sire_id, a.depth + 1, a.path || '>sire'
  FROM ancestry a
  JOIN dogs d ON d.id = a.ancestor_id
  WHERE a.depth < p_depth AND d.sire_id IS NOT NULL
  UNION ALL
  SELECT
    d.dam_id, a.depth + 1, a.path || '>dam'
  FROM ancestry a
  JOIN dogs d ON d.id = a.ancestor_id
  WHERE a.depth < p_depth AND d.dam_id IS NOT NULL
)
SELECT DISTINCT ancestor_id, depth, path FROM ancestry WHERE ancestor_id IS NOT NULL;
$$ LANGUAGE sql STABLE;
```

---

## STEP 2 — COI Calculation Engine

Create `lib/breeding/coi.ts` — pure functions, no side effects, fully tested:

```ts
/**
 * Wright's Coefficient of Inbreeding (COI) Calculator
 *
 * COI measures the probability that both alleles at a given locus are
 * identical by descent (IBD). Formula: F = Σ[(0.5)^(n+m+1) × (1+FA)]
 * where n = path length through sire, m = path length through dam,
 * FA = COI of the common ancestor itself.
 *
 * Thresholds (industry standard):
 *   < 3.0%  — Excellent (outcross or well-managed linebreeding)
 *   3–5%    — Acceptable (moderate linebreeding)
 *   5–6.25% — Caution (approaching one generation of half-sibling equivalent)
 *   > 6.25% — Risk (equivalent to one generation of half-sibling mating)
 *   > 12.5% — High risk (equivalent to one generation of sibling mating)
 *   > 25%   — Severe (father × daughter, mother × son)
 *
 * 5% is our internal threshold for Diedericks Dobermanns — we set it
 * lower than the industry standard to protect the breed from DCM accumulation.
 */

export type AncestorEntry = {
  ancestor_id: string
  depth: number
  path: string  // e.g. 'sire>sire>dam'
}

export type CoiResult = {
  coi: number               // 0–100 (percentage)
  severity: 'excellent' | 'acceptable' | 'caution' | 'risk' | 'high_risk'
  common_ancestors: string[] // IDs of dogs that appear in both pedigrees
  explanation: string        // human-readable explanation
}

export function calculateCoi(
  sireAncestors: AncestorEntry[],
  damAncestors: AncestorEntry[],
): CoiResult {
  // Find common ancestors
  const sireIds = new Map<string, number[]>()  // ancestor_id → [depths]
  const damIds = new Map<string, number[]>()

  for (const a of sireAncestors) {
    if (!sireIds.has(a.ancestor_id)) sireIds.set(a.ancestor_id, [])
    sireIds.get(a.ancestor_id)!.push(a.depth)
  }
  for (const a of damAncestors) {
    if (!damIds.has(a.ancestor_id)) damIds.set(a.ancestor_id, [])
    damIds.get(a.ancestor_id)!.push(a.depth)
  }

  const commonAncestors = [...sireIds.keys()].filter(id => damIds.has(id))

  // Wright's formula: each path through a common ancestor
  let f = 0
  for (const ancestorId of commonAncestors) {
    const sirePaths = sireIds.get(ancestorId)!
    const damPaths = damIds.get(ancestorId)!
    for (const n of sirePaths) {
      for (const m of damPaths) {
        f += Math.pow(0.5, n + m + 1)
      }
    }
  }

  const coiPercent = Math.round(f * 10000) / 100  // 2 decimal places

  let severity: CoiResult['severity']
  let explanation: string

  if (coiPercent < 3) {
    severity = 'excellent'
    explanation = `COI of ${coiPercent}% — excellent. Low genetic overlap. Healthy genetic diversity expected.`
  } else if (coiPercent < 5) {
    severity = 'acceptable'
    explanation = `COI of ${coiPercent}% — acceptable linebreeding. Monitor retained pups for Holter at 24 months.`
  } else if (coiPercent < 6.25) {
    severity = 'caution'
    explanation = `COI of ${coiPercent}% — approaching our 5% threshold. Consider a cross pairing with the opposite line before proceeding.`
  } else if (coiPercent < 12.5) {
    severity = 'risk'
    explanation = `COI of ${coiPercent}% — RISK. Equivalent to half-sibling mating. Cross to the other line. Do not proceed without veterinary genetics review.`
  } else {
    severity = 'high_risk'
    explanation = `COI of ${coiPercent}% — HIGH RISK. This pairing should not proceed. Seek outcross immediately.`
  }

  return {
    coi: coiPercent,
    severity,
    common_ancestors: commonAncestors,
    explanation,
  }
}

export function coiColour(severity: CoiResult['severity']): string {
  switch (severity) {
    case 'excellent':    return '#22C55E'  // green
    case 'acceptable':   return '#84CC16'  // lime
    case 'caution':      return '#F59E0B'  // amber
    case 'risk':         return '#EF4444'  // red
    case 'high_risk':    return '#7F1D1D'  // dark red
  }
}
```

---

## STEP 3 — Data Hook

Create `hooks/useBreedingPlanner.ts`:

```ts
/**
 * Fetches all data needed for the visual breeding planner:
 * - Active males (sires) — grouped by line
 * - Active females (dams) — grouped by their assigned male
 * - Planned pairings with COI estimates
 * - Ancestor lists for COI calculation
 */

// Fetch breeding dogs (males and females separately)
// Males filter: sex='male', status IN ('keep','stud'), breeding_role IN ('Sire','Both','Prospect')
// Females filter: sex='female', status='keep', breeding_role IN ('Dam','Both','Prospect')

// For each planned pairing, fetch ancestors of both sire and dam via get_ancestors()
// then call calculateCoi() to get the COI estimate

// Return:
// {
//   males: BreedingDog[]        — ordered by line (A first, B second, Cross/unknown last)
//   femalesByMale: Map<string, BreedingDog[]>  — keyed by male.id
//   unassignedFemales: BreedingDog[]           — females with no assigned male
//   pairings: PairingWithCoi[]
//   refresh: () => void
//   loading: boolean
//   error: string | null
// }
```

Each `BreedingDog` needs:
- `id, name, call_name, sex, date_of_birth, status, line, generation, breeding_role`
- `photo_url` — from Supabase Storage (use the first photo from `dog_media` where `is_primary = true`)
- `health_dcm1..5, health_hd, health_ed` — for health gate display
- `urgency_flag`
- `sire_id, dam_id` — for COI traversal

---

## STEP 4 — Visual Planner Screen

Create `app/(admin)/breeding/planner.tsx`

### Layout (conceptual):

```
┌─────────────────────────────────────────────────────────┐
│  VISUAL BREEDING PLANNER              [+ PAIR] [⚙ INFO] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──── LINE A ────┐   ┌──── LINE B ────┐              │
│   │ [Photo] SANTINI │   │ [Photo] HUNTER  │              │
│   │ ● Gen 1 Sire   │   │ ● Gen 1 Sire    │              │
│   │ ✓ Health Clear │   │ ✓ Health Clear  │              │
│   └────────────────┘   └─────────────────┘              │
│        │                      │                         │
│   [SVG lines drawn from females up to their sire]       │
│        │                      │                         │
│   ┌─ HAILEY ──┐         ┌─ CLEO ───┐                  │
│   │ [photo]   │ ─3.2%─▶ │ [photo]  │ ─2.1%─▶          │
│   │ ⚠ Urgent  │         │ ✓ Active │                   │
│   └───────────┘         └──────────┘                   │
│   ┌─ CENDRA ──┐         ┌─ KIM ────┐                  │
│   │ [photo]   │ ─4.1%─▶ │ [photo]  │ ─ Future ─▶      │
│   │ ✓ Active  │         │ 📅 2027  │                   │
│   └───────────┘         └──────────┘                   │
│   ┌─ HANNAH ──┐                                         │
│   │ [photo]   │ ─── AWAITING GEN 2 LINE B SIRE ───▶    │
│   │ 🔒 Locked │                                         │
│   └───────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation requirements:

**1. Column layout:**
- `ScrollView horizontal={true}` wrapping a `Row` of male columns
- Each male column: `width: screenWidth / Math.min(males.length, 3)`, minimum 160px
- Male card at top: circular photo (80px), name, line badge (A=red, B=navy, Cross=green), gen number, health status icon

**2. Female cards:**
- Below each male: their allocated females stacked vertically
- Female card: circular photo (56px), name, COI badge pill, status chip
- COI badge uses `coiColour()` from `lib/breeding/coi.ts`
- Urgency flame icon 🔥 if `urgency_flag = true`

**3. SVG connecting lines:**
- Use `react-native-svg` with an absolute-positioned `Svg` overlay covering the whole planner
- Each line: curved bezier from the female card's right/top edge → male card's bottom edge
- Line colour from `coiColour(severity)`
- Line style: solid for Planned/Active, dashed for Future, grey for Completed, red X for Prohibited
- COI % label sits on the midpoint of the line (small pill)

**4. Measure positions using `onLayout`:**
```ts
// Track y-position of each card using a ref map
const cardPositions = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())

// In each card:
<View onLayout={(e) => {
  cardPositions.current.set(dog.id, e.nativeEvent.layout)
}} />
```

**5. Tap to plan/edit:**
- Tap a female card → opens bottom sheet: "Plan pairing for [Name]"
  - Shows her current allocation
  - Sire picker (males only)
  - COI preview updates live as male is selected
  - Save → updates `pairings` table, line re-draws
- Tap a connecting line → opens pairing detail (COI breakdown, health gates, dates)

---

## STEP 5 — COI Information Panel

Create `components/breeding/CoiInfoPanel.tsx` — triggered by the ⚙ INFO button in the header.

This is the "additional knowledge" section. Display as a scrollable bottom sheet:

```
UNDERSTANDING INBREEDING COEFFICIENTS

What is COI?
The Coefficient of Inbreeding (COI) measures the probability that both
copies of a gene in a puppy are identical because they came from the same
ancestor. Developed by Dr. Sewall Wright in 1922.

A COI of 6.25% means there is a 6.25% chance any gene the puppy carries
is a matching copy from a shared ancestor — the same as one generation of
half-sibling mating.

──────────────────────────────────────
  OUR SCALE (Diedericks Dobermanns)
──────────────────────────────────────
  🟢 < 3.0%    EXCELLENT
                Healthy diversity. Ideal for programme sustainability.

  🟡 3.0–5.0%  ACCEPTABLE
                Moderate linebreeding. Monitor pups with Holter at 24 months.

  🟠 5.0–6.25% CAUTION
                Approaching risk zone. Consider crossing to the other line.

  🔴 > 6.25%   RISK
                Equivalent to half-sibling. Do not proceed without genetics review.

  ⛔ > 12.5%   HIGH RISK
                Equivalent to full sibling mating. Never proceed.

──────────────────────────────────────
  WHY DOBERMANNS ARE DIFFERENT
──────────────────────────────────────
  The Dobermann breed was created from just a handful of foundation dogs.
  This means the entire breed already carries a baseline COI of roughly
  12–15% when calculated across all known generations.

  DCM (Dilated Cardiomyopathy) is genetically linked in Dobermanns.
  Multiple variants exist (DCM1–DCM5). High COI increases the chance
  that a puppy receives two copies of a defective variant.

  This is why we test DCM1 through DCM5 on every breeding dog — not
  just DCM1 as many breeders do. And it is why we set our COI threshold
  at 5%, lower than the breed-standard 6.25%.

──────────────────────────────────────
  LINE BREEDING vs INBREEDING
──────────────────────────────────────
  Line breeding: deliberately concentrating the genetics of ONE outstanding
  ancestor while keeping COI below 6.25%. Used to fix type, working drive,
  and temperament consistently across generations.

  Inbreeding: repeating close relatives (siblings, parent × offspring).
  COI typically > 12.5%. Rapidly amplifies both positive traits AND
  genetic defects.

  Diedericks Dobermanns practises controlled line breeding within each
  line, with deliberate crosses between lines every second generation to
  prevent COI accumulation. No outside blood will ever be purchased.

──────────────────────────────────────
  HOW THE CALCULATION WORKS
──────────────────────────────────────
  We use Wright's Path Coefficient method, analysing 4 generations of
  pedigree (parents, grandparents, great-grandparents, great-great-
  grandparents). Every ancestor that appears in BOTH the sire's and dam's
  pedigree contributes to the COI based on how many steps removed they are.

  A common ancestor 3 generations back contributes less than one
  2 generations back. The formula: F = Σ(0.5)^(n+m+1) where n and m
  are the number of steps from the common ancestor through the sire and
  dam sides respectively.

──────────────────────────────────────
  SELF-SUSTAINING PROGRAMME
──────────────────────────────────────
  For a two-line programme to remain self-sustaining indefinitely:

  • Each line needs minimum 1 active sire + 2 active dams at all times
  • Within-line pairings: every 1–2 generations, check COI
  • When COI approaches 5%: cross to the other line for one generation
  • Retain the best cross pup and return it to the original line
  • Repeat every 2nd generation to keep both lines genetically refreshed
  • Never let a line drop below 1 sire — the programme cannot recover
    without introducing outside blood

  Sources: Wright (1922), Lacy (1997), Leroy (2011) — inbreeding effects
  in domestic dogs; Meurs et al (2019) — DCM genetic variants in Dobermann.
```

---

## STEP 6 — Assign Female to Male (Allocation)

If a female has no assigned male in her pairing record, she appears in an **"Unassigned Dams"** section below the columns.

Allow admin to drag-allocate (or tap to allocate) a female to a male:
- Tap unassigned female → bottom sheet: "Assign [Name] to a sire"
- Select sire → COI preview shown
- Confirm → creates a `pairings` record with `status = 'Planned'`
- Female moves up into that male's column

---

## STEP 7 — Update Plan After Real Pairing

When a real pairing happens (mating confirmed):
1. Admin taps the connecting line → "Record Mating"
2. Enters actual mating date → updates `pairings.date_bred` and `pairings.status = 'Active'`
3. When litter is born → taps "Record Litter" → whelp date, pup count, pup sexes
4. Admin selects retained pup(s) → assigns `line`, `generation = parent.generation + 1`, `breeding_role`
5. New pup appears in planner as a "Prospect" node in the NEXT generation column
6. System auto-suggests: "This male/female should fill [Line X Sire/Dam 2] in Gen 2"
7. The SVG redraws to show Gen 2 nodes connected to Gen 2 planned pairings

---

## STEP 8 — Required Files

Create/update these files:

```
lib/breeding/coi.ts                          ← COI calculation engine (Step 2)
hooks/useBreedingPlanner.ts                  ← Data hook (Step 3)
app/(admin)/breeding/planner.tsx             ← Main visual screen (Step 4)
components/breeding/MaleColumn.tsx           ← One male's column (max 150 lines)
components/breeding/FemaleCard.tsx           ← Female card with photo + COI badge
components/breeding/MaleCard.tsx             ← Male card with photo + health status
components/breeding/PlannerLines.tsx         ← SVG overlay drawing connections
components/breeding/CoiInfoPanel.tsx         ← Educational bottom sheet (Step 5)
components/breeding/PairingDetailSheet.tsx   ← Tap a line → see pairing details
components/breeding/AllocateSireSheet.tsx    ← Assign female to male
```

No file over 300 lines. If a component is growing large, split it.

---

## STEP 9 — Add to Breeding Navigation

In `app/(admin)/breeding/index.tsx`, add a fourth action card:

```tsx
<ActionCard
  icon="chart-timeline-variant"
  label="VISUAL PLANNER"
  subtitle="Lines, pairings & COI map"
  onPress={() => router.push('/breeding/planner')}
/>
```

---

## STEP 10 — Database: Store COI on Pairings

When a pairing is saved or updated, calculate COI and store it:

```sql
-- Already exists: pairings.coi_estimate float
-- After calculating via the hook, update the record:
UPDATE pairings SET coi_estimate = [calculated value] WHERE id = [pairing_id]
```

This means COI does not need to be recalculated on every render — only when pedigree data changes.

---

## CRITICAL WARNINGS

- Do NOT use `.map()` to render the dog cards in long lists — use FlatList
- Do NOT recalculate COI on every render — memoize with `useMemo` and only recalculate when pedigree data changes
- Do NOT hardcode dog IDs — always look them up by name from the dogs table
- The SVG overlay must be `pointerEvents="none"` so taps pass through to the cards below
- Dog photos come from Supabase Storage signed URLs — cache them, do not re-fetch on every render
- Keep `planner.tsx` under 200 lines — all logic in the hook, all SVG in `PlannerLines.tsx`, all cards in their own components

---

## Testing Checklist

- [ ] Three male columns show side by side (Santini | Hunter | future slot)
- [ ] Each male shows photo, name, line badge (A=dark red, B=navy), generation, health gate icon
- [ ] Females appear under their assigned male with circular photo
- [ ] COI badge on each female card (colour coded green/amber/red)
- [ ] SVG lines connect each female to her sire column — line colour matches COI
- [ ] Hannah shows with locked icon and "Awaiting Gen 2 Line B Sire" label
- [ ] Hailey shows urgency flame icon (age 5+)
- [ ] Tapping a female card opens allocate/plan sheet
- [ ] COI updates live as sire is changed in the sheet
- [ ] COI Info Panel opens with full educational content
- [ ] Completed pairings show dashed grey line
- [ ] Prohibited pairings show red ✗ line (not selectable)
- [ ] Unassigned females shown in section below columns
- [ ] After recording a litter + retaining a pup, the pup appears as a Gen 2 prospect node
- [ ] No TypeScript errors
- [ ] No file over 300 lines
