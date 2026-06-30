# Cursor Prompt — Fix Dog Status Mismatch + Quick-Status Panel

## Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

## NO MIGRATION NEEDED — This is a logic/UI fix only.

---

## THE ROOT CAUSE — Read This First

The Dogs list screen filters dogs using `hooks/useKennelDogs.ts`. The filter queries
use specific `status` values. But `DogForm.tsx` and any status-change UI save DIFFERENT
values. This causes dogs to vanish from all tabs after saving.

### Exact mismatch:

| What the user intends | What filter queries for | What form currently saves |
|-----------------------|------------------------|--------------------------|
| Breeding Stock (female) | `status = 'keep'` | `status = 'breeding_stock'` ← WRONG |
| Stud (male) | `status = 'stud'` | possibly `status = 'stud'` ✓ or wrong |
| Deceased | `status = 'deceased'` | `status = 'deceased'` ✓ |
| Alumni (placed/sold) | `status = 'sold'` | `status = 'retired'` or `'alumni'` ← WRONG |
| Expecting | derived from heat_cycles | N/A — not a status value |

### Files to read before making any changes:
- `components/forms/DogForm.tsx` — check exact status option values in the form
- `hooks/useKennelDogs.ts` — the filter queries (source of truth for what values work)
- `components/dogs/detail/DogOverviewTab.tsx` — where quick-status panel will go

---

## TASK 1 — Audit and fix `DogForm.tsx` status values

Open `components/forms/DogForm.tsx`. Find the status `OptionGroup` or select field.

Change the option **values** (not labels) so they match what `useKennelDogs` queries:

```ts
// Status options — values must match useKennelDogs filter queries exactly:
{ value: 'keep',     label: 'Breeding Female' },   // females: shows in Breeding Stock tab
{ value: 'stud',     label: 'Stud' },              // males:   shows in Breeding Stock tab
{ value: 'deceased', label: 'In Memory' },         // shows in Deceased tab
{ value: 'sold',     label: 'Alumni / Placed' },   // shows in Alumni tab
{ value: 'in_training', label: 'In Training' },
{ value: 'puppy',    label: 'Puppy' },
{ value: 'retired',  label: 'Retired' },
```

> IMPORTANT: The label shown to the user can be anything friendly. The VALUE stored
> in the database must match what `useKennelDogs.ts` queries for. Do not change
> `useKennelDogs.ts` — fix the form to match it.

---

## TASK 2 — Create `components/dogs/detail/DogStatusPanel.tsx`

A quick-action status panel for the dog profile. Replaces the need to go into full edit
mode just to change a dog's lifecycle status.

### UI design:
```
KENNEL STATUS
──────────────────────────────────────────────────────
Current:  [BREEDING FEMALE]   ← current status badge, gold

[♀ Breeding Female]  [♂ Stud]  [🤰 Expecting]  [📚 Alumni]  [🕊 In Memory]
     ↑ active chip highlighted gold — others outline
     
     Note under "Expecting": "Expecting status is set via Heat Cycles — record a
     mating date in the Heat tab to mark this dog as expecting."
──────────────────────────────────────────────────────
```

**Show/hide logic per sex:**
- Female dog: show [Breeding Female] [Expecting (info only)] [Alumni] [In Memory]
- Male dog: show [Stud] [Alumni] [In Memory]
- Always hide the sex-irrelevant options

**Chips map to these status values:**
```ts
const STATUS_OPTIONS = {
  female: [
    { label: 'Breeding Female', value: 'keep',     icon: '♀' },
    { label: 'Alumni / Placed', value: 'sold',     icon: '🎓' },
    { label: 'In Memory',       value: 'deceased', icon: '🕊' },
  ],
  male: [
    { label: 'Stud',            value: 'stud',     icon: '♂' },
    { label: 'Alumni / Placed', value: 'sold',     icon: '🎓' },
    { label: 'In Memory',       value: 'deceased', icon: '🕊' },
  ],
}
```

**"Expecting" is informational only** — show a small info note that says:
"Appears automatically when a mating date is recorded in the Heat Cycles tab."
Do NOT add an "Expecting" button that writes a status value — it is derived from
heat_cycles data, not a status field.

**On tap a different chip:**
1. Show `Alert.alert('Change status?', 'Move [Dog Name] to [New Status]?', [Cancel, Confirm])`
2. On Confirm: `await supabase.from('dogs').update({ status: newValue }).eq('id', dog.id)`
3. Call `onStatusChanged()` prop to trigger a refresh of the parent screen
4. Show toast: "[Dog Name] moved to [Label] ✓"

**Props:**
```ts
interface DogStatusPanelProps {
  dog: Dog        // needs dog.id, dog.name, dog.sex, dog.status
  onStatusChanged: () => void   // refresh callback
}
```

**Deceased confirmation** — extra warning when selecting "In Memory":
```ts
Alert.alert(
  'Mark as Deceased?',
  `This will move ${dog.name} to the In Memory section. This cannot be undone easily.`,
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: () => void doUpdate('deceased') },
  ]
)
```

Keep this file under 120 lines.

---

## TASK 3 — Add `DogStatusPanel` to `DogOverviewTab.tsx`

In `components/dogs/detail/DogOverviewTab.tsx`:

1. Import `DogStatusPanel`
2. Add it **after the photo and before the "General" SectionCard**:

```tsx
<DogStatusPanel dog={dog} onStatusChanged={onRefresh} />
```

3. `DogOverviewTab` must accept and pass through an `onRefresh` prop:
```ts
interface DogOverviewTabProps {
  dog: Dog
  onRefresh: () => void   // ADD THIS
}
```

4. In `app/(admin)/dogs/[id]/index.tsx`, pass `refresh` from `useDog()` into the tab:
```tsx
<DogOverviewTab dog={dog} onRefresh={refresh} />
```

Check how `DogDetailTabs` passes the `dog` prop down to `DogOverviewTab` and thread
`onRefresh` through that component too if needed.

---

## TASK 4 — Fix `useKennelDogs.ts` to also catch legacy status values

Some dogs in the database may already have `status = 'breeding_stock'` or
`status = 'retired'` saved by the old form. Widen the filter queries to catch them
so no dog gets lost:

```ts
// Breeding tab — include breeding_stock as legacy value
.in('status', ['keep', 'stud', 'breeding_stock'])

// Alumni tab — include retired and donated as legacy values  
.in('status', ['sold', 'retired', 'donated', 'gifted'])
```

Then within the breeding tab, classify them:
```ts
// Studs: male + stud status
studs: dogs.filter(d => d.sex === 'male' || d.status === 'stud')

// Females: female + keep or breeding_stock status
females: dogs.filter(d => d.sex === 'female' && d.status !== 'stud')
```

This ensures no dog falls through the cracks while we migrate to the correct values.

---

## TASK 5 — Update `DogStatusBadge.tsx` to handle all status values

Open `components/dogs/DogStatusBadge.tsx`. Make sure these mappings exist:

```ts
const STATUS_MAP = {
  keep:           { label: 'Breeding Female', tone: 'gold' },
  stud:           { label: 'Stud',            tone: 'gold' },
  breeding_stock: { label: 'Breeding',        tone: 'gold' },  // legacy
  deceased:       { label: 'In Memory',       tone: 'muted' },
  sold:           { label: 'Alumni',          tone: 'silver' },
  retired:        { label: 'Retired',         tone: 'silver' }, // legacy
  donated:        { label: 'Alumni',          tone: 'silver' }, // legacy
  gifted:         { label: 'Alumni',          tone: 'silver' }, // legacy
  in_training:    { label: 'In Training',     tone: 'blue' },
  puppy:          { label: 'Puppy',           tone: 'silver' },
}
```

---

## FILE STRUCTURE

```
components/dogs/detail/
  DogStatusPanel.tsx      ← CREATE (Task 2)
  DogOverviewTab.tsx      ← ADD DogStatusPanel + onRefresh prop (Task 3)

components/forms/
  DogForm.tsx             ← FIX status option values (Task 1)

components/dogs/
  DogStatusBadge.tsx      ← ADD missing status mappings (Task 5)

hooks/
  useKennelDogs.ts        ← WIDEN filter queries (Task 4)

app/(admin)/dogs/[id]/
  index.tsx               ← PASS refresh to DogDetailTabs (Task 3)
```

---

## CRITICAL WARNINGS

- The FIX is in the form VALUES, not the labels — labels can be anything user-friendly
- Do NOT change the query logic in `useKennelDogs` beyond widening the IN() arrays
- "Expecting" must NOT be a status value — it is derived from heat_cycles.mating_date
- Deceased confirmation alert must use `style: 'destructive'` on the confirm button
- The `onStatusChanged` callback must trigger a full data refresh so the profile header
  and badge update immediately after the status change
- Keep `DogStatusPanel.tsx` under 120 lines
- `npx tsc --noEmit` must pass

---

## TESTING CHECKLIST

- [ ] Open a female dog → DogStatusPanel shows "Breeding Female", "Alumni", "In Memory" chips
- [ ] Open a male dog → shows "Stud", "Alumni", "In Memory" chips (no Breeding Female)
- [ ] Current status chip is gold/filled, others are outline
- [ ] Tap a different chip → confirmation alert appears
- [ ] Cancel → nothing changes
- [ ] Confirm → status updates in DB immediately
- [ ] Dog profile badge updates to new status without navigating away
- [ ] Navigate back to Dogs list → dog appears in correct filter tab
- [ ] Female set to 'keep' → appears in Breeding Stock tab under BREEDING FEMALES
- [ ] Male set to 'stud' → appears in Breeding Stock tab under studs
- [ ] Dog set to 'sold' → appears in Alumni tab
- [ ] Dog set to 'deceased' → appears in Deceased tab
- [ ] Dog previously saved with 'breeding_stock' status → still appears in Breeding Stock tab (Task 4 fix)
- [ ] Dog previously saved with 'retired' status → appears in Alumni tab (Task 4 fix)
- [ ] Deceased alert shows destructive red confirm button
- [ ] Expecting info note shown on female profiles (no button, just text)
- [ ] DogForm status dropdown also shows correct labels and saves correct values
- [ ] `npx tsc --noEmit` passes
