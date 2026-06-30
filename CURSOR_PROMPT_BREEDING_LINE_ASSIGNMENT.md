# Cursor Prompt — Breeding Line Assignment & Pairing Builder Grouping

## Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

## NO MIGRATION NEEDED — These columns already exist

The following columns are already on the `dogs` table (migration 0015):
- `line` — text, CHECK IN ('A', 'B', 'Cross', 'Unknown')
- `breeding_role` — text, CHECK IN ('Sire', 'Dam', 'Both', 'Retired', 'Prospect')
- `generation` — integer
- `urgency_flag` — boolean
- `health_dcm1–5`, `health_hd`, `health_ed`, `holter_date`, `holter_result`

The existing `useBreedingDogs()` in `hooks/useBreedingProgramme.ts` already fetches these fields.
The `BreedingDog` type in `types/breeding.ts` already includes all of them.

**No migration required — this is purely a UI task.**

---

## What Already Exists — Read These Files First

| File | Purpose |
|------|---------|
| `app/(admin)/breeding/pairing-builder.tsx` | Pairing Builder screen — has `DogPicker` component |
| `components/dogs/detail/DogBreedingTab.tsx` | Breeding tab on dog detail — shows litters and heats |
| `hooks/useBreedingProgramme.ts` | `useBreedingDogs()` fetches sires + dams with `line` field |
| `types/breeding.ts` | `BreedingDog`, `BreedingLine`, `BreedingRole` types |
| `components/dogs/detail/SectionCard.tsx` | Used in DogBreedingTab — reuse |
| `components/dogs/detail/DetailRow.tsx` | Used in DogBreedingTab — reuse |
| `components/forms/fields.tsx` | `OptionGroup`, `ControlledInput` — reuse if possible |

## Current Problem
1. **DogBreedingTab** shows litter history and heat cycles but has NO way to set `line`, `breeding_role`, or `generation` on a dog — so there's no way to mark a dog as "Line A" or "Breeding Dam" from the UI
2. **DogPicker in pairing-builder.tsx** shows all sires/dams as flat button chips with just a name — no line grouping, no line badge, no visual separation between Line A, B, and Cross dogs

---

## TASK 1 — Add "Breeding Programme" section to `DogBreedingTab.tsx`

Add a new editable section **at the very top of the breeding tab**, before the existing "Breeding summary" card.

### Display (when not editing):
```
BREEDING PROGRAMME
─────────────────────────────────────────────────────
Breeding Line      LINE A                   [Edit]
Role               Sire
Generation         Gen 2
Urgency Flag       ⚠ Urgent                  (shown only if urgency_flag = true)
─────────────────────────────────────────────────────
```

If the dog has no line/role set yet, show:
```
BREEDING PROGRAMME
─────────────────────────────────────────────────────
This dog has not been assigned to a breeding line.
[Assign to Breeding Programme]
```

### Edit mode (inline — no separate screen):
When [Edit] or [Assign to Breeding Programme] is tapped, the card expands to show:

```
BREEDING LINE
[LINE A]  [LINE B]  [LINE CROSS]  [UNKNOWN]   ← gold chip when selected

BREEDING ROLE
[Sire]  [Dam]  [Both]  [Prospect]  [Retired]  ← gold chip when selected

GENERATION
[text input — number only — "2"]

URGENCY FLAG
[toggle — "Mark as urgent breeding priority"]

[SAVE]  [CANCEL]
```

### On Save:
```ts
await supabase
  .from('dogs')
  .update({
    line: selectedLine,
    breeding_role: selectedRole,
    generation: generationNumber || null,
    urgency_flag: urgencyFlag,
  })
  .eq('id', dog.id)
```

Show toast "Breeding programme updated ✓" on success.
Show toast with error message on failure.

### Implementation rules:
- Manage edit state locally with `useState` — no new hook needed
- Keep DogBreedingTab.tsx under 300 lines — if it gets close, extract the new section into `components/dogs/detail/BreedingProgrammeSection.tsx`
- Import `requireSupabase` for the update call

---

## TASK 2 — Upgrade `DogPicker` in `pairing-builder.tsx` — Group by Line

Extract `DogPicker` from pairing-builder.tsx into its own file:
`components/breeding/LinedDogPicker.tsx`

### New design — grouped by breeding line:

```
DAM *

LINE A
──────────────────────────────
[● Cuba]  [● Cyprys De Zelig]

LINE B
──────────────────────────────
[● Claire]  [● Cendra]

LINE CROSS
──────────────────────────────
[● Zara]

UNASSIGNED
──────────────────────────────
[● Unknown Dam]
```

**Line section header:** gold label "LINE A" / "LINE B" / "LINE CROSS" / "UNASSIGNED"
**Dog chip:** gold border + filled gold background when selected, outline when not
**Selected dog chip** also shows a small line badge: `[Cuba · A]`
**Unassigned section:** only show if there are dogs with `line = null` or `line = 'Unknown'`

### Line colour coding (subtle left border on chip):
- Line A: gold border `#C4A35A`
- Line B: teal border `#22d3ee`
- Line Cross: amber border `#f97316`
- Unassigned: grey border `#6b7280`

### Props:
```ts
interface LinedDogPickerProps {
  label: string
  dogs: BreedingDog[]
  selectedId: string
  onSelect: (id: string) => void
}
```

### Grouping logic:
```ts
const LINE_ORDER = ['A', 'B', 'Cross', 'Unknown', null] as const

function groupByLine(dogs: BreedingDog[]) {
  const groups: Record<string, BreedingDog[]> = {
    A: [], B: [], Cross: [], Unassigned: []
  }
  for (const dog of dogs) {
    if (dog.line === 'A') groups.A.push(dog)
    else if (dog.line === 'B') groups.B.push(dog)
    else if (dog.line === 'Cross') groups.Cross.push(dog)
    else groups.Unassigned.push(dog)
  }
  return groups
}
```

Only render a section if it has at least 1 dog.

### Update pairing-builder.tsx:
Replace the two `DogPicker` usages with `LinedDogPicker`.
Import from `@/components/breeding/LinedDogPicker`.

---

## TASK 3 — Show line badge on selected dog in Pairing Builder health panel

In `HealthPanel` (inside pairing-builder.tsx), add the line badge next to the dog name:

```
SIRE: Hillo Betelges  [LINE B]
DCM1–5: Clear/Clear/Clear/—/— · HD: A · ED: 0
✓ Health gate passed
```

Add a `LineBadge` component inline or in a shared location:
```tsx
function LineBadge({ line }: { line: string | null }) {
  if (!line || line === 'Unknown') return null
  const colors = {
    A: '#C4A35A', B: '#22d3ee', Cross: '#f97316'
  }
  return (
    <View style={{
      backgroundColor: colors[line as keyof typeof colors] + '22',
      borderColor: colors[line as keyof typeof colors],
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
    }}>
      <Typography variant="caption" style={{ color: colors[line as keyof typeof colors], fontSize: 10 }}>
        LINE {line.toUpperCase()}
      </Typography>
    </View>
  )
}
```

---

## TASK 4 — Auto-suggest pairing line based on selected sire + dam

In pairing-builder.tsx, when both sire and dam are selected, auto-suggest the correct line:

```ts
function suggestLine(sire: BreedingDog, dam: BreedingDog): 'A' | 'B' | 'Cross' {
  if (sire.line === dam.line && sire.line !== null && sire.line !== 'Unknown') {
    return sire.line as 'A' | 'B'  // Same line = line breeding
  }
  return 'Cross'  // Different lines = line cross
}
```

When both sire and dam are selected:
- Auto-set the line selector to the suggested value
- Show a note: "💡 Suggested: Line Cross (different lines selected)" or "💡 Suggested: Line A (same-line pairing)"
- User can still override manually

---

## FILE STRUCTURE

```
components/breeding/
  LinedDogPicker.tsx        ← CREATE — grouped dog selector with line sections
  BreedingLineSection.tsx   ← optional split if DogBreedingTab gets too long

components/dogs/detail/
  DogBreedingTab.tsx        ← ADD breeding programme section at top
  BreedingProgrammeSection.tsx  ← CREATE if needed to keep DogBreedingTab under 300 lines

app/(admin)/breeding/
  pairing-builder.tsx       ← UPDATE — use LinedDogPicker, add auto-suggest, add LineBadge
```

---

## CRITICAL WARNINGS

- Do NOT create a new migration — all columns already exist
- The `useBreedingDogs()` hook in `useBreedingProgramme.ts` already returns `line` on every dog — do not rewrite it
- `DogBreedingTab` receives `dog: Dog` (from `app.types`) not `BreedingDog` — the update call should use `requireSupabase()` directly, not a breeding hook
- Keep the existing heat cycle and litter history sections in `DogBreedingTab` — do not remove them
- After updating a dog's line via the edit form, call `loadLitters()` or a local refresh so the card updates
- `LinedDogPicker` must handle the case where ALL dogs are unassigned (no line set) — just show one flat list, no section headers
- `npx tsc --noEmit` must pass

---

## TESTING CHECKLIST

**DogBreedingTab — Breeding Programme section:**
- [ ] Dog with no line/role shows "not assigned" state with "Assign" button
- [ ] Dog with line set shows LINE A / LINE B / LINE CROSS badge
- [ ] Tapping Edit enters inline edit mode
- [ ] Line A/B/Cross/Unknown chips select correctly (gold when active)
- [ ] Role chips select correctly
- [ ] Generation number saves as integer
- [ ] Urgency flag toggle saves
- [ ] Save sends correct UPDATE to Supabase
- [ ] Toast confirms save
- [ ] Cancel reverts to display mode without saving

**LinedDogPicker in Pairing Builder:**
- [ ] Dogs grouped under LINE A / LINE B / LINE CROSS / UNASSIGNED headers
- [ ] Empty sections not shown
- [ ] Selected dog chip shows gold filled state
- [ ] Tapping a chip calls onSelect with correct dog id
- [ ] Line colour border shows on each chip

**Auto-suggest line:**
- [ ] Same-line pairing → suggests Line A or B (whichever they share)
- [ ] Different-line pairing → suggests Line Cross
- [ ] Suggestion note appears below picker
- [ ] User can override the suggested line

**Line badge in health panel:**
- [ ] LINE A / LINE B / LINE CROSS badge shows next to sire and dam names
- [ ] Correct colour per line
- [ ] Does not crash if line is null
