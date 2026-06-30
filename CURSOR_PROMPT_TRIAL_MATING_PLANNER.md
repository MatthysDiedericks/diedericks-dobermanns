# CURSOR PROMPT — Trial Mating Planner + Breeding Programme Layout Fix

## Context

**Project:** Diedericks Dobermanns — React Native / Expo app  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind, Zustand  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`

**Relevant existing files:**
- `app/(admin)/breeding/index.tsx` — Breeding Programme screen (has layout issue)
- `app/(admin)/breeding/planner.tsx` — Visual Planner screen
- `app/(admin)/breeding/pairing-builder.tsx` — Pairing Builder screen
- `hooks/useBreedingPlanner.ts` — COI calculation logic using `fetchPedigreeMap`, `resolveAncestors`, `calculateCoi`
- `lib/breeding/coi.ts` — `calculateCoi(sireAncestors, damAncestors): CoiResult` — already works
- `lib/breeding/ancestors.ts` — `fetchPedigreeMap(dogId)` and `resolveAncestors(id, map, depth)`
- `lib/breeding/constants.ts` — `BREEDING_DOG_SELECT`, `PAIRING_SELECT`, `LINE_COLORS`
- `types/breeding.ts` — `PairingRecord`, `PairingWithCoi`, `PlannerDog`, `CoiResult`
- `components/breeding/PairingCard.tsx` — existing pairing display card
- `components/breeding/PairingDetailSheet.tsx` — existing bottom sheet for pairing detail

**Pairings table columns:** `id, sire_id, dam_id, line, generation, status, priority, target_date, date_bred, coi_estimate, expected_litter_date, litter_id, notes, created_at, updated_at`

**Current pairings status CHECK:** `('Planned', 'Active', 'Completed', 'Cancelled', 'Prohibited')`  
**Current pairings priority CHECK:** `('Critical', 'Urgent', 'High', 'Active', 'Future', 'Prohibited', 'Done')`

**COI severity thresholds (from `lib/breeding/coi.ts`):**
- excellent < 3% | acceptable 3–5% | caution 5–8% | risk 8–12% | high_risk ≥ 12%

---

## What to build

### Part 1 — Fix Breeding Programme screen layout (index.tsx)

**Problem:** The screen uses `ScreenContainer scroll={false}` but nests a `ScrollView` for the pairings list inside. The inner ScrollView never gets a proper height because no parent has `flex: 1` — the list gets cut off or doesn't scroll.

**Fix in `app/(admin)/breeding/index.tsx`:**

```tsx
// BEFORE — outer container scroll={false} with nested ScrollView getting no height
<ScreenContainer scroll={false}>
  ...header, alerts, generation tabs (horizontal ScrollView), action buttons...
  <ScrollView className="px-6 pb-12">  {/* ← never gets height */}
    ...pairings list...
  </ScrollView>
</ScreenContainer>

// AFTER — split into fixed header section + flex-1 content area
<ScreenContainer scroll={false}>
  {/* Fixed header — never scrolls */}
  <View className="flex-none">
    {/* PageHeader, gold line, status, alerts, urgent dams */}
    {/* Generation tabs (horizontal ScrollView) */}
    {/* Action buttons row */}
  </View>

  {/* Flex content — this takes all remaining space and scrolls */}
  <View className="flex-1">
    {loading ? (
      <View className="px-6"><CardListSkeleton count={4} /></View>
    ) : (
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* pairings list content */}
      </ScrollView>
    )}
  </View>
</ScreenContainer>
```

The key fix: wrap the scrollable pairings area in `<View className="flex-1">` so it fills remaining vertical space.

---

### Part 2 — Migration 0022: Add 'Trial' status to pairings

**File:** `supabase/migrations/0022_pairings_trial.sql`

```sql
-- 0022 — Add Trial status to pairings for sandbox planning
-- Allows trial pairings to live in the same table without appearing in main programme.

ALTER TABLE pairings
  DROP CONSTRAINT IF EXISTS pairings_status_check;

ALTER TABLE pairings
  ADD CONSTRAINT pairings_status_check
  CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled', 'Prohibited', 'Trial'));

ALTER TABLE pairings
  ADD COLUMN IF NOT EXISTS trial_generation int DEFAULT 1
    CHECK (trial_generation BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS trial_notes text;
```

> **Apply this via Supabase dashboard SQL editor or MCP before running Cursor.**

---

### Part 3 — New hook: `hooks/useTrialPairings.ts`

**Purpose:** Fetch, create, delete, and reset trial pairings. Also calculates COI for a candidate sire+dam pair on-the-fly.

```typescript
// hooks/useTrialPairings.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchPedigreeMap, resolveAncestors } from '@/lib/breeding/ancestors';
import { calculateCoi, type CoiResult } from '@/lib/breeding/coi';
import { PAIRING_SELECT } from '@/lib/breeding/constants';
import { requireSupabase } from '@/lib/supabase';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import type { PairingRecord } from '@/types/breeding';

export interface TrialPairing extends PairingRecord {
  trial_generation: number;
  trial_notes: string | null;
  coi_result?: CoiResult;
}

export interface NewTrialInput {
  sire_id: string;
  dam_id: string;
  line: 'A' | 'B' | 'Cross';
  trial_generation: number;
  target_date?: string | null;
  notes?: string | null;
  coi_estimate?: number | null;
}

export function useTrialPairings() {
  const [trials, setTrials] = useState<TrialPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sb = requireSupabase();
      const { data, error: err } = await sb
        .from('pairings')
        .select(PAIRING_SELECT + ', trial_generation, trial_notes')
        .eq('status', 'Trial')
        .order('trial_generation', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) throw err;
      setTrials((data ?? []) as TrialPairing[]);
    } catch (e) {
      setError('Could not load trial pairings.');
      console.error('[useTrialPairings]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  const addTrial = useCallback(async (input: NewTrialInput) => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb.from('pairings').insert({
        sire_id: input.sire_id,
        dam_id: input.dam_id,
        line: input.line,
        generation: input.trial_generation,
        trial_generation: input.trial_generation,
        trial_notes: input.notes ?? null,
        status: 'Trial',
        priority: 'Future',
        target_date: input.target_date ?? null,
        coi_estimate: input.coi_estimate ?? null,
        notes: input.notes ?? null,
      });
      if (err) throw err;
      showSaved('Trial pairing added');
      await fetch();
    } catch (e) {
      showError('Could not save trial pairing.');
      console.error('[useTrialPairings.addTrial]', e);
    }
  }, [fetch]);

  const deleteTrial = useCallback(async (id: string) => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb
        .from('pairings').delete().eq('id', id).eq('status', 'Trial');
      if (err) throw err;
      setTrials((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      showError('Could not remove trial.');
      console.error('[useTrialPairings.deleteTrial]', e);
    }
  }, []);

  /** Converts a trial into a real Planned pairing. Irreversible. */
  const promoteToPlan = useCallback(async (id: string) => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb
        .from('pairings')
        .update({ status: 'Planned', priority: 'Future' })
        .eq('id', id)
        .eq('status', 'Trial');
      if (err) throw err;
      showSaved('Pairing promoted to Planned');
      await fetch();
    } catch (e) {
      showError('Could not promote pairing.');
      console.error('[useTrialPairings.promoteToPlan]', e);
    }
  }, [fetch]);

  /** Deletes ALL trial pairings. Used by Reset button. */
  const resetAllTrials = useCallback(async () => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb
        .from('pairings').delete().eq('status', 'Trial');
      if (err) throw err;
      setTrials([]);
      showSaved('All trial pairings cleared');
    } catch (e) {
      showError('Could not reset trials.');
      console.error('[useTrialPairings.resetAllTrials]', e);
    }
  }, []);

  /**
   * Calculates live COI for a sire+dam candidate pair.
   * Returns CoiResult or null if ancestors not found.
   */
  const calcCoi = useCallback(async (
    sireId: string,
    damId: string,
  ): Promise<CoiResult | null> => {
    try {
      const [sireMap, damMap] = await Promise.all([
        fetchPedigreeMap(sireId),
        fetchPedigreeMap(damId),
      ]);
      const sireAnc = resolveAncestors(sireId, sireMap, 4);
      const damAnc = resolveAncestors(damId, damMap, 4);
      return calculateCoi(sireAnc, damAnc);
    } catch (e) {
      console.error('[useTrialPairings.calcCoi]', e);
      return null;
    }
  }, []);

  return { trials, loading, error, refresh: fetch, addTrial, deleteTrial, promoteToPlan, resetAllTrials, calcCoi };
}
```

---

### Part 4 — New component: `components/breeding/TrialPairingCard.tsx`

Displays a single trial pairing with COI badge, generation label, sire × dam names, and action buttons.

```tsx
interface TrialPairingCardProps {
  trial: TrialPairing;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
}
```

Layout (brand styled — dark surface card):
```
┌─────────────────────────────────────────────┐
│ GEN 2 TRIAL               [COI badge: 3.2%] │
│                                              │
│ SireName × DamName                           │
│ Line A · Target: Jun 2026                   │
│ trial_notes (if any)                        │
│                                             │
│  [Promote to Plan]        [✕ Remove]        │
└─────────────────────────────────────────────┘
```

COI badge colours (from `CoiSeverity`):
- `excellent` → green text on green/10 bg
- `acceptable` → gold text on gold/10 bg
- `caution` → orange text
- `risk` → red text
- `high_risk` → red text with danger border

Use `Alert.alert('Remove Trial?', 'This trial pairing will be discarded.', [...])` before calling `onDelete`.

---

### Part 5 — New component: `components/breeding/AddTrialSheet.tsx`

Bottom sheet using `@gorhom/bottom-sheet` for adding a new trial pairing.

**Fields:**
1. **Sire** — searchable dog selector (filter: `sex = 'Male'`, `status IN ('keep','stud','breeding_stock')`, `breeding_role IN ('Sire','Both','Prospect')`)
2. **Dam** — searchable dog selector (filter: `sex = 'Female'`, `status = 'keep'`, `breeding_role IN ('Dam','Both','Prospect')`)
3. **Line** — OptionGroup: `A / B / Cross`
4. **Generation** — OptionGroup: `Gen 1 / Gen 2 / Gen 3 / Gen 4 / Gen 5` (maps to trial_generation 1–5)
5. **Target Date** — optional `DateField` (platform-aware date picker — on web use `<input type="date">` styled to brand, on native use `@react-native-community/datetimepicker`)
6. **Notes** — optional multiline `Input`

**COI live preview:**
- When both sire AND dam are selected, show a loading spinner then display the COI result inline in the sheet before saving
- Example: `🧬 COI: 3.2% — Acceptable`

**Save button:** disabled until sire, dam, and line are all selected.

**Export handle type:**
```typescript
export interface AddTrialSheetHandle {
  open: () => void;
}
```

**Dog selector within this sheet:** Create a simple internal `DogPicker` sub-component:
- `FlatList` of dogs with name + line + generation columns
- Search `Input` at top filtering by `name` or `call_name`
- Tap to select, selected dog shows a gold checkmark
- Max height 300, inside the bottom sheet scroll area
- This is internal to the file only — do NOT create a separate file

---

### Part 6 — New screen: `app/(admin)/breeding/trial-planner.tsx`

Full-page trial mating planner.

```
┌───────────────────────────────────────────┐
│ ← TRIAL MATING PLANNER                   │
│ ─────────────────────────────────────────│
│                                           │
│  ⚗  Sandbox mode — trials are not        │
│     committed to the breeding programme. │
│                                           │
│  [+ Add Trial Pairing]   [↺ Reset All]   │
│                                           │
│  GEN 1                                   │
│  ┌─────────────────────────────────────┐ │
│  │ Santini × Cendra   COI: 2.1%       │ │
│  │ Line A · Target: Aug 2026           │ │
│  │ [Promote to Plan]  [✕ Remove]      │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  GEN 2                                   │
│  ┌─────────────────────────────────────┐ │
│  │ Zeus × Hailey      COI: 5.8% ⚠     │ │
│  │ Line B · Target: 2027               │ │
│  │ [Promote to Plan]  [✕ Remove]      │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

**Implementation details:**
- Use `useTrialPairings()` hook
- Group trials by `trial_generation` using `useMemo` → render a section header per generation
- `SectionList` or manual grouping with `FlatList` (manual grouping is fine since counts are low)
- **"+ Add Trial Pairing"** button opens `AddTrialSheet` via ref
- **"↺ Reset All"** button → `Alert.alert('Reset all trials?', 'This will delete all trial pairings. This cannot be undone.', [{text:'Cancel'}, {text:'Reset', style:'destructive', onPress: resetAllTrials}])`
- Empty state: `EmptyState` component with message "No trial pairings yet. Add a trial to start planning future matings."
- Pull-to-refresh on the list
- Loading state: `CardListSkeleton count={3}`
- Error state: red text with Retry button
- File must stay under 250 lines — extract `TrialPairingCard` and `AddTrialSheet` as separate component files

---

### Part 7 — Update `app/(admin)/breeding/index.tsx`

Add a "Trial Mating" button to the existing action buttons row, navigating to the new screen:

```tsx
// In the flex-row flex-wrap gap-2 View containing existing buttons, add:
<Button
  label="Trial Mating"
  variant="outline"
  size="sm"
  onPress={() => router.push('/(admin)/breeding/trial-planner' as never)}
/>
```

Also apply the **layout fix from Part 1** in this same file.

---

## File summary

| Action | File |
|--------|------|
| CREATE (migration) | `supabase/migrations/0022_pairings_trial.sql` |
| CREATE (hook) | `hooks/useTrialPairings.ts` |
| CREATE (component) | `components/breeding/TrialPairingCard.tsx` |
| CREATE (component) | `components/breeding/AddTrialSheet.tsx` |
| CREATE (screen) | `app/(admin)/breeding/trial-planner.tsx` |
| EDIT | `app/(admin)/breeding/index.tsx` — layout fix + Trial Mating button |

---

## Execution order

1. Apply `0022_pairings_trial.sql` migration to Supabase first
2. Create `hooks/useTrialPairings.ts`
3. Create `components/breeding/TrialPairingCard.tsx`
4. Create `components/breeding/AddTrialSheet.tsx`
5. Create `app/(admin)/breeding/trial-planner.tsx`
6. Edit `app/(admin)/breeding/index.tsx` (layout fix + button)

---

## Critical rules

- **NEVER** insert `total_score` directly into `dog_temperament_scores` — it is a GENERATED ALWAYS column
- **NEVER** put `SUPABASE_SERVICE_ROLE_KEY` in any client-side variable
- `pairings` with `status = 'Trial'` must be **excluded** from all existing hooks (`useBreedingProgramme`, `useBreedingPlanner`) — add `.neq('status', 'Trial')` filter if not already present
- The `AddTrialSheet` dog selector must call `calcCoi` only after both sire and dam are selected — do not call it on every render
- Every file must stay under 300 lines
- No TypeScript errors — run `npx tsc --noEmit` and fix all errors before finishing
- All brand colours must use NativeWind classes from constants, not hardcoded hex strings

---

## Testing checklist

- [ ] Migration applied cleanly — `status = 'Trial'` accepted in pairings table
- [ ] Existing pairings with other statuses still appear correctly in main Breeding Programme screen
- [ ] Trial Mating button appears on Breeding Programme screen and navigates to trial-planner
- [ ] Add Trial Pairing sheet opens, sire/dam search works, COI calculates after both selected
- [ ] Trial pairing saves to DB with `status = 'Trial'`
- [ ] Trial pairing card shows correct sire, dam, COI badge colour, generation
- [ ] Promote to Plan changes status to 'Planned' and removes card from trial list
- [ ] Remove single trial works with confirmation alert
- [ ] Reset All clears all trials with confirmation alert
- [ ] Empty state shows when no trials exist
- [ ] Pull-to-refresh works
- [ ] Breeding Programme main screen scrolls properly — pairings list not cut off
- [ ] No TypeScript errors
