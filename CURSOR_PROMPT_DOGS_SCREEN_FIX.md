# CURSOR PROMPT — Dogs Screen Tab Restructure

## Context

**Project:** Diedericks Dobermanns mobile app
**File to fix:** `app/(admin)/dogs/index.tsx` (and related hooks)
**Stack:** React Native, Expo Router, TypeScript, Supabase, NativeWind
**Brand:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`

## Current Problem

The Dogs screen has tabs: All Dogs | My Dogs | Litters | Breeding
- "Breeding" tab shows "No dogs found" — filter is wrong
- "All Dogs" is cluttered and not useful for a breeder
- Tab names don't reflect how a breeder thinks about their dogs

## Current Dog Statuses in Database

| Status | Dogs | Meaning |
|--------|------|---------|
| `keep` | Cendra, Claire, Cleopatra, Cyrus, Hailey, Hannah, Odessa | Active breeding females |
| `stud` | Hugo, HunterKing, Santini | Active stud males |
| `deceased` | Cait, Celsea, Chester, Cuba | Deceased dogs |
| `sold` | Ade, Bliksem, Boomer, Dexter, Eben, Hazel, Liv, Loki, Miles, Raptor, Shanti, Zara, Zues | Placed dogs |

## New Tab Structure

Replace ALL existing tabs with these 4:

```
[ Breeding Stock ] [ Expecting ] [ Deceased ] [ Alumni ]
```

### Tab 1 — Breeding Stock
**Filter:** `status IN ('keep', 'stud')`
Shows all active kennel dogs — our breeding females and studs.

Sub-group visually (no separate tabs — just section headers within the list):
- **Studs** (sex = 'male', status = 'stud') — HunterKing, Hugo, Santini
- **Breeding Females** (sex = 'female', status = 'keep') — Cendra, Claire, etc.

### Tab 2 — Expecting
**Filter:** Dogs that have an active heat cycle with `mating_date IS NOT NULL` and `actual_whelp_date IS NULL`

Query:
```sql
SELECT DISTINCT d.* FROM dogs d
INNER JOIN heat_cycles hc ON hc.dog_id = d.id
WHERE hc.mating_date IS NOT NULL
  AND hc.actual_whelp_date IS NULL
  AND hc.status NOT IN ('completed', 'skipped')
```

Each card shows:
- Dam name + photo
- Mating date
- Expected whelp date range (whelp_date_earliest to whelp_date_latest)
- Sire name (from hc.sire_id → dogs.name)
- Days until earliest whelp (countdown)
- Estimated go-home window

If no dogs expecting: show empty state "No litters currently expected"

### Tab 3 — Deceased
**Filter:** `status = 'deceased'`
Shows: Cait, Celsea, Chester, Cuba
Each card shows name, sex, date of birth, date of death (if recorded)
Slightly muted style — same card but with reduced opacity or grey accent instead of gold

### Tab 4 — Alumni
**Filter:** `status = 'sold'`
Label: **"Alumni"** (NOT "Sold" — premium terminology for placed dogs)
Shows all 13 placed dogs
Each card shows name, sex, colour, placement date if available

---

## Search Bar — Keep Linked Across All Tabs

The search bar at the top must remain visible and active on ALL tabs.
Search filters by: `name`, `call_name`, `microchip_number`
Search applies WITHIN the currently active tab — not across all dogs.

Example: if on Alumni tab, searching "Bliksem" only searches within Alumni dogs.

Implementation:
```ts
const [search, setSearch] = useState('')
const [activeTab, setActiveTab] = useState<'breeding' | 'expecting' | 'deceased' | 'alumni'>('breeding')

const filteredDogs = dogs.filter(dog =>
  dog.name.toLowerCase().includes(search.toLowerCase()) ||
  dog.call_name?.toLowerCase().includes(search.toLowerCase()) ||
  dog.microchip_number?.toLowerCase().includes(search.toLowerCase())
)
```

---

## Dog Card Design

Each dog card shows:
- Photo (left, rounded square, 64x64)
- Name (bold, gold)
- Call name in brackets if different e.g. "HunterKing (Hunter)"
- Sex + colour dot (♂ blue | ♀ pink)
- Status badge (small pill)
- For Breeding Stock females: heat status indicator (if active heat → red dot "In Heat")
- For Expecting: whelp countdown chip "Whelping in 14 days"
- Tap → navigate to `app/(admin)/dogs/[id]/index.tsx`

---

## Remove These Tabs Completely

- ❌ "All Dogs" — too cluttered, not useful
- ❌ "My Dogs" — unclear meaning
- ❌ "Litters" — belongs in its own Litters section, not here

---

## Testing Checklist

- [ ] Breeding Stock tab shows all 10 active dogs (7 females + 3 studs)
- [ ] Studs grouped above Breeding Females within Breeding Stock tab
- [ ] Expecting tab shows dogs with active heat cycle + mating date
- [ ] Deceased tab shows Cait, Celsea, Chester, Cuba
- [ ] Alumni tab shows all 13 placed dogs (NOT labelled "Sold" anywhere on screen)
- [ ] Search bar filters within active tab only
- [ ] Search works by name, call name, and microchip number
- [ ] Tapping any dog navigates to dog detail screen
- [ ] Heat status indicator shows on breeding females (red dot if in heat)
