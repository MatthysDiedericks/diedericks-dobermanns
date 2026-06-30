# Cursor Prompt — Wire Up Breeding Programme Navigation

## Context

The Breeding Programme screens already exist at:
- `app/(admin)/breeding/index.tsx` — dashboard
- `app/(admin)/breeding/pairing-builder.tsx` — pairing builder
- `app/(admin)/breeding/litter-recorder.tsx` — litter recorder
- `app/(admin)/breeding/organogram.tsx` — generation tree

These screens are not yet linked to navigation. Wire them up now.

---

## STEP 1 — Add BREEDING to the bottom tab navigator

Open the main tab layout file — likely one of:
- `app/(admin)/_layout.tsx`
- `app/(tabs)/_layout.tsx`

Add a BREEDING tab between DOGS and LITTERS:

```tsx
<Tabs.Screen
  name="breeding"
  options={{
    title: 'BREEDING',
    tabBarIcon: ({ color }) => (
      <MaterialCommunityIcons name="dna" size={22} color={color} />
    ),
  }}
/>
```

Icon: use `dna` from MaterialCommunityIcons, or `git-branch` from Feather if MaterialCommunityIcons is not available.

Tab label: **BREEDING** (all caps, matches existing tab style)

---

## STEP 2 — Breeding Programme entry screen

`app/(admin)/breeding/index.tsx` should be the landing screen when the user taps BREEDING.

It must show:
1. **Header:** "BREEDING PROGRAMME" in gold, with subtitle "Born With Purpose. Built With Discipline."
2. **Three action cards** at the top:
   - 📋 **PLAN A PAIRING** → navigates to `pairing-builder`
   - 🐾 **RECORD A LITTER** → navigates to `litter-recorder`
   - 🌳 **GENERATION TREE** → navigates to `organogram`
3. **Active pairings list** below (already built — keep as-is)

---

## STEP 3 — Fix ALL dog pickers in the breeding module

This is critical. Every dog dropdown/picker in breeding screens must ONLY show dogs eligible for breeding.

### The filter rule (use this everywhere):

```ts
// hooks/useBreedingDogs.ts
export function useBreedingDogs(role?: 'sire' | 'dam' | 'both') {
  return useQuery({
    queryKey: ['breeding-dogs', role],
    queryFn: async () => {
      let query = supabase
        .from('dogs')
        .select('id, name, call_name, date_of_birth, sex, status, breeding_role, line, generation, sire_id, dam_id, health_dcm1, health_dcm2, health_dcm3, health_dcm4, health_dcm5, health_hd, health_ed, urgency_flag')
        .in('status', ['keep', 'stud'])           // ONLY active kennel dogs
        .in('breeding_role', ['Sire', 'Dam', 'Both', 'Prospect'])  // ONLY breeding-assigned dogs
        .order('name', { ascending: true })

      if (role === 'sire') {
        query = query.eq('sex', 'male')
      } else if (role === 'dam') {
        query = query.eq('sex', 'female')
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
```

### Apply this hook to:
- `pairing-builder.tsx` — sire picker uses `useBreedingDogs('sire')`, dam picker uses `useBreedingDogs('dam')`
- `litter-recorder.tsx` — dam picker uses `useBreedingDogs('dam')`
- `breeding/index.tsx` — urgency banner checks for `urgency_flag = true` among `useBreedingDogs()`

### What this EXCLUDES automatically (never shows in breeding pickers):
- ❌ Alumni / sold dogs (status = 'sold')
- ❌ Deceased dogs (status = 'deceased')
- ❌ Dogs without breeding_role assigned (null or 'Retired')
- ❌ Puppies / prospects not yet assigned a breeding role

---

## STEP 4 — Pairing builder flow (user journey)

When user taps "PLAN A PAIRING":

1. Screen opens with two dropdowns: **Select Sire** | **Select Dam**
2. Sire dropdown shows: males with status=keep/stud AND breeding_role IN (Sire, Both, Prospect)
3. Dam dropdown shows: females with status=keep AND breeding_role IN (Dam, Both, Prospect)
4. As soon as BOTH are selected:
   - Run `checkPairingValidity(sire, dam)` immediately
   - Show result: ✓ green banner "Pairing is valid" OR ✗ red banner "[specific reason]"
   - Show health gate: green tick or ⚠ for any pending/failed tests
   - Show age gate: dam's age in months, warning if under 24 months
5. If valid: show "Save Pairing" button → saves to pairings table with status=Planned
6. If prohibited: "Save Pairing" button is disabled and greyed out

---

## STEP 5 — Dashboard urgency banner

On `breeding/index.tsx`, show a red banner at the very top if any dam has `urgency_flag = true`:

```tsx
{urgentDams.length > 0 && (
  <View className="bg-red-900 border border-red-500 rounded-lg p-3 mb-4">
    <Text className="text-red-200 font-bold text-xs uppercase tracking-wider">⚠ Urgent — Act on Next Heat</Text>
    {urgentDams.map(dam => (
      <Text key={dam.id} className="text-white mt-1">
        {dam.name} — Age 5+, not yet bred this season
      </Text>
    ))}
  </View>
)}
```

---

## STEP 6 — Back navigation from breeding sub-screens

All sub-screens (pairing-builder, litter-recorder, organogram) must have:
- Back arrow in header → returns to `breeding/index`
- Header title matching the screen name

---

## Testing Checklist

- [ ] BREEDING tab appears in bottom nav between DOGS and LITTERS
- [ ] Tapping BREEDING lands on the breeding dashboard
- [ ] "Plan a Pairing" opens the pairing builder
- [ ] Sire picker shows ONLY males with status keep/stud + breeding role assigned
- [ ] Dam picker shows ONLY females with status keep + breeding role assigned
- [ ] Deceased dogs (Cait, Celsea, Chester, Cuba) do NOT appear in any picker
- [ ] Alumni/sold dogs do NOT appear in any picker
- [ ] Hunter × Hailey → red ✗ banner "Father/daughter — prohibited" instantly
- [ ] Santini × Cendra → green ✓ banner "Pairing is valid"
- [ ] Urgency banner shows if Hailey has urgency_flag = true
- [ ] "Record a Litter" and "Generation Tree" buttons navigate correctly
- [ ] Back navigation works from all sub-screens
