# CURSOR PROMPT — LITTER CALENDAR & CONTRACTS TABS

## Context

App: Diedericks Dobermanns
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
Supabase: nlmwxodvquwbjinhhbmr
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

The admin litter detail screen (`app/(admin)/litters/[id]/index.tsx`) already has multiple tabs built. Two tabs are currently stubs (they exist in the tab bar but show empty content):

1. **Calendar tab** — litter-related calendar events (vet visits, weigh days, deworming, handovers)
2. **Contracts tab** — purchase contracts linked to puppies from this litter

Additionally, the client portal is missing a **Vaccination Records** screen — clients should be able to see their puppy's vaccination history.

Do NOT recreate any existing tabs (Puppies, Weights, Health, Photos, Notes, Todos, Reports, Financials, Sharing). Only fill in the stubs and add the portal screen.

---

## TASK 1 — Audit the Litter Detail Tab Bar

Open `app/(admin)/litters/[id]/index.tsx` and identify the current tab list. Find which tabs render empty/stub content. The two to implement are Calendar and Contracts.

---

## TASK 2 — Litter Calendar Tab

Create or update: `components/litters/LitterCalendarTab.tsx`

**What it shows:**
A chronological list of all calendar events related to this litter, grouped by week.

**Data source:** Query `calendar_events` table:
```typescript
const { data } = await supabase
  .from('calendar_events')
  .select('id, title, event_type, event_date, notes, dog_id')
  .eq('litter_id', litterId)
  .order('event_date', { ascending: true });
```

If `litter_id` column doesn't exist on `calendar_events`, also query by dog_id for each puppy in the litter:
```typescript
// Fallback: get all puppies in litter, then query events by dog_id
const puppyIds = puppies.map(p => p.id);
.in('dog_id', puppyIds)
```

**What each event card shows:**
- Event title
- Event type badge (Vet Visit / Weigh Day / Deworming / Vaccination / Handover / Other)
- Date formatted as "Mon 14 Jul 2026"
- Notes (if any)
- Overdue indicator (red dot if event_date < today and not marked done)

**Add Event button** (admin only):
- Bottom sheet with fields: Title, Type (picker), Date (date picker), Notes
- Saves to `calendar_events` with `litter_id` = current litter id

**Empty state:** "No events scheduled — tap + to add your first milestone"

---

## TASK 3 — Litter Contracts Tab

Create or update: `components/litters/LitterContractsTab.tsx`

**What it shows:**
All purchase contracts for puppies from this litter.

**Data source:**
```typescript
const { data } = await supabase
  .from('contracts')
  .select(`
    id, status, contract_title, signed_by_client, signed_at, created_at,
    client:profiles!client_id(full_name, email),
    dog:dogs!dog_id(name, colour)
  `)
  .eq('litter_id', litterId)
  .order('created_at', { ascending: false });
```

If `litter_id` doesn't exist on `contracts`, query via puppy dog_ids (same fallback pattern as Task 2).

**Each contract card shows:**
- Puppy name + colour badge
- Client full name + email
- Contract title
- Status badge: Draft (grey) / Sent (gold) / Signed (green) / Expired (red)
- Date signed (if signed)
- "Send eSign" button (secondary, small) — only if status is not 'signed_client'
  - On press: call `useContracts().sendEsign(contract.id)`

**Create Contract button:**
- Simple bottom sheet: select puppy (from this litter's puppies), select client (from profiles)
- Creates a draft contract record linked to litter_id and dog_id

**Empty state:** "No contracts for this litter yet"

---

## TASK 4 — Portal: Vaccination Records Screen (Optional but Recommended)

Create: `app/(portal)/vaccination-records.tsx`

Add to portal layout as a hidden route: `<Tabs.Screen name="vaccination-records" options={{ href: null }} />`

Link from the client's portal dashboard under "My Puppy" section.

**What it shows:**
Vaccination history for the client's reserved/purchased puppy.

**Data source:**
```typescript
// Get the client's puppy from their reservation
const { data: reservation } = await supabase
  .from('reservations')
  .select('puppy_id, dog:dogs!puppy_id(id, name)')
  .eq('client_id', userId)
  .eq('status', 'confirmed')
  .single();

// Then get health records for that puppy
const { data: records } = await supabase
  .from('health_records')
  .select('id, record_type, title, date_administered, next_due_date, notes, administered_by')
  .eq('dog_id', reservation.puppy_id)
  .in('record_type', ['vaccination', 'deworming'])
  .order('date_administered', { ascending: false });
```

**Display:**
- Puppy name as header
- Two sections: Vaccinations | Deworming
- Each record: title, date given, next due date (highlighted in gold if due within 30 days, red if overdue), vet/administered by
- Download button (future — shows "Coming soon" toast)

**Empty state:** "No vaccination records yet — check back after your puppy's first vet visit"

---

## CRITICAL WARNINGS

- Do NOT recreate existing tabs (Puppies, Weights, Health, Photos, Notes, Todos, Reports, Financials, Sharing)
- Do NOT apply any migration for tables that already exist — check first with `IF NOT EXISTS`
- If `litter_id` column is missing from `contracts` or `calendar_events`, add it with a migration using `ADD COLUMN IF NOT EXISTS litter_id UUID REFERENCES litters(id) ON DELETE SET NULL`
- Keep all component files under 300 lines
- Use the existing `useLittersIndex` or `useLitterHealth` hooks as reference patterns for new hooks

---

## New Hook to Create

Create: `hooks/useLitterCalendar.ts`
- Fetches calendar events for a litter
- Returns: `{ events, loading, error, addEvent, refresh }`

Create: `hooks/useLitterContracts.ts`
- Fetches contracts for a litter
- Returns: `{ contracts, loading, error, createContract, sendEsign, refresh }`

---

## Testing Checklist

- [ ] Open any litter → Calendar tab shows events list (or empty state)
- [ ] Add Event → event appears immediately in list
- [ ] Contracts tab shows contracts linked to this litter's puppies
- [ ] "Send eSign" button triggers the correct action
- [ ] Portal vaccination screen shows puppy's health records
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No files over 300 lines
