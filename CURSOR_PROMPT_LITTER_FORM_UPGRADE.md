# Cursor Prompt — Upgrade LitterForm with Missing Fields

## Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

## What Already Exists — Read These Files First

| File | Purpose |
|------|---------|
| `components/forms/LitterForm.tsx` | Current form — needs upgrading |
| `components/forms/fields.tsx` | `ControlledInput`, `OptionGroup`, `ToggleRow` — reuse these |
| `hooks/useDogs.ts` | Existing hook — use to fetch dam/sire candidates |
| `hooks/useMutations.ts` | `saveLitter`, `useSubmitting` — keep using these |
| `types/app.types.ts` | `Litter`, `Dog` types |
| `types/database.types.ts` | `TablesInsert<'litters'>` |

## Current Form Fields (what exists now)
- name, status, expected_date, available_count, puppy_count, description, is_public

## What Is Missing
- **Dam** (mother_id) — searchable select from existing female dogs
- **Sire** (father_id) — searchable select from existing male dogs
- **Litter letter** (litter_letter) — single character A–Z
- **Whelping type** (whelping_type) — Natural / C-Section
- **Actual whelp date** (actual_date) — shown when status = born or placed
- **Actual whelp time** (actual_time) — shown when status = born or placed
- **Go home date** (go_home_date) — when puppies leave

---

## TASK 1 — Database migration 0019_litter_form_fields.sql

Check if these columns already exist before adding them:

```sql
-- Add missing columns to litters table
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS litter_letter text,          -- e.g. 'A', 'B', 'I'
  ADD COLUMN IF NOT EXISTS whelping_type text
    CHECK (whelping_type IN ('natural', 'c_section')),  -- Natural or C-Section
  ADD COLUMN IF NOT EXISTS actual_date date,            -- actual whelp date (different from expected_date)
  ADD COLUMN IF NOT EXISTS actual_time time,            -- time of first whelp (already added in 0017 — skip if exists)
  ADD COLUMN IF NOT EXISTS go_home_date date;           -- when pups go to new homes
```

> Note: If migration 0017 already added `actual_time`, omit it here to avoid duplicate column error.

---

## TASK 2 — Create `hooks/useBreedingDogs.ts`

New hook that fetches dogs eligible as dam or sire (adult breeding dogs, not puppies).

```ts
// hooks/useBreedingDogs.ts
import { useCallback, useEffect, useState } from 'react'
import { requireSupabase, supabase } from '@/lib/supabase'

export interface BreedingDog {
  id: string
  name: string
  sex: string | null
  colour: string | null
  registration_number: string | null
}

export function useBreedingDogs() {
  const [dogs, setDogs] = useState<BreedingDog[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const client = requireSupabase()
      const { data, error } = await client
        .from('dogs')
        .select('id, name, sex, colour, registration_number')
        .not('status', 'eq', 'puppy')       // exclude pups
        .not('status', 'eq', 'sold')         // exclude sold
        .eq('is_public', false)              // breeding dogs are internal records
        .order('name')
      if (error) throw error
      setDogs((data ?? []) as BreedingDog[])
    } catch {
      setDogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  const females = dogs.filter(d => d.sex === 'female' || d.sex === 'F')
  const males   = dogs.filter(d => d.sex === 'male'   || d.sex === 'M')

  return { females, males, loading }
}
```

---

## TASK 3 — Create `components/forms/DogSelectField.tsx`

A searchable dog picker used for Dam and Sire selection.

```
Props:
  label: string
  value: string | null        (selected dog id)
  onChange: (id: string | null) => void
  dogs: BreedingDog[]
  placeholder: string

UI:
  Label row above
  Pressable field showing selected dog name (or placeholder in muted)
    → opens a Modal with:
      - Search text input at top
      - Filtered list of dog names (+ colour/registration)
      - Tap to select → closes modal, updates value
      - "Clear" option at top of list
  Chevron icon on right of field
  
Styling:
  Match existing form field style from ControlledInput
  Background: Surface (#1C1A0E), border gold/20, gold text on select
```

Keep this file under 120 lines. No external libraries — use React Native Modal + FlatList.

---

## TASK 4 — Upgrade `components/forms/LitterForm.tsx`

Replace the current form with the upgraded version. Keep the same `LitterFormProps` interface (`litter?: Litter`, `onSaved: () => void`).

### New zod schema:
```ts
const litterSchema = z.object({
  name:           z.string(),
  litter_letter:  z.string().max(1).toUpperCase().optional(),
  status:         z.enum(['planned', 'expected', 'born', 'placed']),
  mother_id:      z.string().uuid().nullable(),
  father_id:      z.string().uuid().nullable(),
  whelping_type:  z.enum(['natural', 'c_section']).nullable(),
  expected_date:  z.string(),       // YYYY-MM-DD
  actual_date:    z.string(),       // YYYY-MM-DD — shown when born/placed
  actual_time:    z.string(),       // HH:MM — shown when born/placed
  go_home_date:   z.string(),       // YYYY-MM-DD
  available_count: z.string(),
  puppy_count:    z.string(),
  description:    z.string(),
  is_public:      z.boolean(),
})
```

### Field layout (in order):

```
LITTER NAME         [text input — "A-Litter (Sire × Dam)"]

LITTER LETTER       [text input — single char, auto-uppercase — "A"]

STATUS              [Planned] [Expected] [Born] [Placed]   ← OptionGroup

DAM (MOTHER)        [DogSelectField — females only]

SIRE (FATHER)       [DogSelectField — males only]

WHELPING TYPE       [Natural] [C-Section]   ← OptionGroup
                    (only show when status = born or placed)

EXPECTED DATE       [text input YYYY-MM-DD]
                    (hide when status = born or placed — actual date takes over)

ACTUAL WHELP DATE   [text input YYYY-MM-DD]
                    (only show when status = born or placed)

ACTUAL WHELP TIME   [text input HH:MM — "06:30"]
                    (only show when status = born or placed)

GO HOME DATE        [text input YYYY-MM-DD]

AVAILABLE COUNT     [number input]

TOTAL PUPPIES       [number input]

DESCRIPTION         [multiline text]

[Publicly visible toggle]

[CREATE LITTER / SAVE CHANGES button]
```

### Conditional visibility logic:
```ts
const status = watch('status')
const isBorn = status === 'born' || status === 'placed'
// Show expected_date only when NOT born/placed
// Show actual_date, actual_time, whelping_type only when born/placed
```

### Payload mapping:
```ts
const payload: TablesInsert<'litters'> = {
  name:           values.name.trim() || null,
  litter_letter:  values.litter_letter?.toUpperCase() || null,
  status:         values.status,
  mother_id:      values.mother_id ?? null,
  father_id:      values.father_id ?? null,
  whelping_type:  isBorn ? (values.whelping_type ?? null) : null,
  expected_date:  !isBorn ? (values.expected_date.trim() || null) : null,
  actual_date:    isBorn  ? (values.actual_date.trim() || null) : null,
  actual_time:    isBorn  ? (values.actual_time.trim() || null) : null,
  go_home_date:   values.go_home_date.trim() || null,
  available_count: toInt(values.available_count),
  puppy_count:    toInt(values.puppy_count),
  description:    values.description.trim() || null,
  is_public:      values.is_public,
}
```

### Auto-generate litter name:
When dam and sire are both selected and name is empty, auto-populate:
```ts
// name = `${litterLetter}-Litter (${sire.name} × ${dam.name})`
// Only if name field is still empty — don't overwrite user input
```

---

## TASK 5 — Regenerate TypeScript types

After applying migration 0019, run:
```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts
```

Then verify `TablesInsert<'litters'>` includes: `litter_letter`, `whelping_type`, `actual_date`, `actual_time`, `go_home_date`, `mother_id`, `father_id`.

---

## CRITICAL WARNINGS

- `DogSelectField` must use React Native `Modal` — not a third-party picker library
- Dam selector filters to `sex = 'female' OR sex = 'F'` — check actual sex values in DB
- `litter_letter` must be stored as single uppercase character
- Do NOT remove the existing `expected_date` field — it is still needed for planned/expected litters
- The `saveLitter` function in `useMutations.ts` may need updating if it does not pass the new columns through — check it and update if needed
- Keep `LitterForm.tsx` under 200 lines — extract `DogSelectField` into its own file
- `npx tsc --noEmit` must pass

---

## TESTING CHECKLIST

- [ ] Status = Planned → shows Expected Date, hides Actual Date/Time/Whelping Type
- [ ] Status = Born → shows Actual Date, Actual Time, Whelping Type, hides Expected Date
- [ ] Dam selector lists only female dogs
- [ ] Sire selector lists only male dogs
- [ ] Search in selector filters correctly
- [ ] Litter name auto-populates when dam + sire selected and name is empty
- [ ] Litter letter auto-uppercases
- [ ] Form saves correctly with new columns in DB
- [ ] Edit existing litter pre-fills all new fields correctly
- [ ] TypeScript passes with no errors
