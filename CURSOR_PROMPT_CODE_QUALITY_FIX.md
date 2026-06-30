# CURSOR PROMPT — CODE QUALITY & ARCHITECTURE FIX
## Diedericks Dobermanns App — Post-Review Cleanup

---

## CONTEXT

You are working on the Diedericks Dobermanns React Native app.

**Stack:** React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind, Supabase  
**Project folder:** `diedericks-dobermanns/`  
**Supabase project:** `nlmwxodvquwbjinhhbmr`

This prompt fixes **8 specific problems** identified in an architecture review. Work through them in the order listed. Do NOT make changes outside the scope of each fix. Do NOT refactor anything that is not listed here.

**CRITICAL RULES:**
- No file may exceed 300 lines after your changes
- No `SELECT *` in any query you touch — always use explicit column lists
- Never import from `@/lib/mockData` in any portal or admin screen
- All data fetching must live in hooks (`hooks/`) or lib query files (`lib/`) — not in screen files
- Run `npx tsc --noEmit` after completing all fixes and resolve any TypeScript errors before finishing

---

## FIX 1 — CRITICAL: Remove Mock Data from Client Portal Screens

**Problem:** Two client-facing screens import fake placeholder dogs (`MOCK_DOGS`) and show them unconditionally. Real clients see fake data.

**Files to fix:**
- `app/(portal)/dashboard.tsx`
- `app/(portal)/reservation.tsx`

### Fix 1a: `app/(portal)/dashboard.tsx`

Remove the `MOCK_DOGS` import. Replace the hardcoded `reservedDog` with a real Supabase query.

The screen should:
1. On mount, fetch the logged-in user's linked dogs:
   ```typescript
   const { data: myDogs } = await supabase
     .from('dogs')
     .select('id, name, colour, sex, status, date_of_birth, microchip_number, dog_media(url, is_primary)')
     .eq('owner_id', user.id)
   ```
2. Show a loading skeleton while fetching
3. Show an empty state ("No dogs linked to your account yet. Contact us to link your dog.") if `myDogs` is empty
4. Show the dog cards when data loads

Extract this data fetching into a hook called `usePortalDogs` in `hooks/usePortal.ts` (add to the existing file if it exists, or create it).

### Fix 1b: `app/(portal)/reservation.tsx`

Remove the `MOCK_DOGS` import. Replace with a real query:
```typescript
const { data: reservation } = await supabase
  .from('reservations')
  .select('*, dog:dogs(id, name, colour, sex, date_of_birth, microchip_number, dog_media(url, is_primary))')
  .eq('client_id', user.id)
  .eq('status', 'confirmed')
  .maybeSingle()
```

Show loading state, empty state ("No active reservation found."), and the reservation card when data loads.

---

## FIX 2 — N+1 Query in Litters View

**Problem:** `useLittersWithPuppies` in `hooks/useDogs.ts` fires one separate Supabase query per litter to fetch puppies. This is a waterfall pattern — 10 litters = 11 database round-trips.

**File:** `hooks/useDogs.ts` — `useLittersWithPuppies` function

**Replace the current implementation with a single JOIN query:**

```typescript
export function useLittersWithPuppies() {
  const [litters, setLitters] = useState<LitterWithPuppies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('litters')
        .select(`
          id, name, status, actual_date, expected_date, go_home_date,
          puppy_count, available_count, notes,
          mother:dogs!litters_mother_id_fkey(id, name),
          father:dogs!litters_father_id_fkey(id, name),
          puppies:dogs(
            id, name, sex, colour, status, date_of_birth,
            dog_media(url, is_primary)
          )
        `)
        .order('actual_date', { ascending: false });
      if (err) throw new Error(err.message);
      setLitters((data ?? []) as unknown as LitterWithPuppies[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litters');
      setLitters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { litters, loading, error, refresh };
}
```

Define `LitterWithPuppies` in `types/app.types.ts` if it does not already exist:
```typescript
export interface LitterWithPuppies {
  id: string;
  name: string | null;
  status: string;
  actual_date: string | null;
  expected_date: string | null;
  go_home_date: string | null;
  puppy_count: number | null;
  available_count: number | null;
  notes: string | null;
  mother: { id: string; name: string } | null;
  father: { id: string; name: string } | null;
  puppies: Dog[];
}
```

---

## FIX 3 — Split `useMutations.ts` (734 lines) into Domain Files

**Problem:** One 734-line file handles mutations for dogs, media, quotes, invoices, waiting list, client groups, and broadcasts. Impossible to navigate or maintain.

**Action:** Split the file into domain-specific files. Move the exports — do NOT change the logic inside any function.

### Create these files:

**`lib/dogs/mutations.ts`** — Move these exports from `hooks/useMutations.ts`:
- `saveDog`
- `deleteDog`
- `saveDogPedigree`
- `DogMediaInput` interface
- `replaceDogMedia`
- `setPrimaryImage`

**`lib/finance/mutations.ts`** — Move these exports:
- `LineItemInput` interface
- `QuoteHeaderInput` interface
- `saveQuote`
- `updateQuoteStatus`
- `deleteQuote`
- `createInvoiceFromQuote`
- `recordInvoicePayment`
- `updateInvoiceStatus`

**`lib/clients/mutations.ts`** — Move these exports:
- `WaitlistUpdate` interface
- `updateWaitlistEntry`
- `setMarketingOptIn`
- `TimelineInput` interface
- `saveTimelineEntry`
- `deleteTimelineEntry`
- `createClientGroup`
- `renameClientGroup`
- `deleteClientGroup`
- `addGroupMember`
- `removeGroupMember`
- `BroadcastInput` interface
- `sendBroadcast`
- `markBroadcastRead`

**Keep `hooks/useMutations.ts`** but have it re-export everything from the new files so existing imports don't break:
```typescript
// hooks/useMutations.ts — now just a re-export barrel
export * from '@/lib/dogs/mutations';
export * from '@/lib/finance/mutations';
export * from '@/lib/clients/mutations';
export type { MutationResult, SaveResult } from '@/lib/shared/mutationTypes';
```

Move `MutationResult` and `SaveResult` interfaces to `lib/shared/mutationTypes.ts`.

After splitting, verify `hooks/useMutations.ts` is under 30 lines (just re-exports). Each new file must be under 250 lines.

---

## FIX 4 — Move Data Fetching Out of Screen Files

**Problem:** 9 screen files query Supabase directly. Data fetching belongs in hooks.

For each screen below, extract the Supabase query into the appropriate hook file, then have the screen call the hook.

### 4a: `app/(admin)/contracts/index.tsx`
Create `hooks/useContracts.ts`:
```typescript
export function useContracts() {
  // Move the contracts + contract_templates query here
  // Query: supabase.from('contracts').select('id, created_at, signed_at, signed_by_client, notes, dog_id, client_id, document_url').order('created_at', { ascending: false })
  // Query: supabase.from('contract_templates').select('id, name, body_html, created_at').order('name')
  // Return { contracts, templates, loading, error, refresh }
}
```

### 4b: `app/(admin)/documents/index.tsx`
Create `hooks/useDocuments.ts` (or add to existing if it exists):
```typescript
export function useKennelDocuments() {
  // Query: supabase.from('kennel_documents')
  //   .select('id, name, category, file_url, storage_path, file_size, mime_type, is_starred, tags, uploaded_by, created_at')
  //   .order('created_at', { ascending: false })
  // Return { documents, loading, error, refresh, toggleStar, deleteDocument }
}
```

### 4c: `app/(admin)/heats/index.tsx`
Create `hooks/useHeats.ts`:
```typescript
export function useHeats() {
  // Query: supabase.from('heat_cycles')
  //   .select('id, dog_id, heat_start_date, next_heat_date, status, mated_date, notes, dog:dogs(id, name, dog_media(url, is_primary))')
  //   .order('next_heat_date', { ascending: true })
  // Return { heats, loading, error, refresh }
}
```

### 4d: `app/(admin)/litters/[id]/index.tsx`
Add `useLitterDetail(id: string)` to `hooks/useDogs.ts`:
```typescript
export function useLitterDetail(id: string) {
  // Query litter + puppies in one JOIN (same pattern as Fix 2)
  // supabase.from('litters').select('*, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name), puppies:dogs(id, name, sex, colour, status, date_of_birth, price, dog_media(url, is_primary))').eq('id', id).single()
  // Return { litter, puppies, loading, error, refresh }
}
```

### 4e: `app/(admin)/todos/index.tsx`
Add `useTodos()` to `hooks/useDashboard.ts` or create `hooks/useTodos.ts`:
```typescript
export function useTodos() {
  // Query: supabase.from('todo_items').select('id, title, due_date, completed, priority, linked_dog_id, linked_litter_id').order('due_date', { ascending: true })
  // Return { todos, loading, error, refresh, completeTodo, deleteTodo }
}
```

### 4f: `app/(tabs)/contacts/enquiries/[id].tsx`
Add `useEnquiry(id: string)` to `hooks/useContacts.ts`:
```typescript
export function useEnquiry(id: string) {
  // Query: supabase.from('enquiries').select('id, full_name, email, phone, subject, message, status, admin_notes, created_at, replied_at, dog_id').eq('id', id).single()
  // Return { enquiry, loading, error, refresh, updateStatus, addNote }
}
```

### 4g: `app/(tabs)/dogs/litters/[id].tsx`
This can use the `useLitterDetail` hook created in Fix 4d.
Update the screen to import and call `useLitterDetail(id)` instead of querying directly.

### 4h: `app/(tabs)/health/vaccinations/[id].tsx`
Add `useVaccination(id: string)` to `hooks/useHealth.ts`:
```typescript
export function useVaccination(id: string) {
  // Query: supabase.from('vaccinations').select('id, vaccine_name, date_given, next_due_date, vet_name, notes, dog_ids, batch_number').eq('id', id).single()
  // Return { vaccination, loading, error, refresh }
}
```

### 4i: `app/(tabs)/health/vet-visits/[id].tsx`
Add `useVetVisit(id: string)` to `hooks/useHealth.ts`:
```typescript
export function useVetVisit(id: string) {
  // Query: supabase.from('vet_visits').select('id, dog_id, visit_date, vet_clinic, vet_name, reason, diagnosis, treatment, medications, follow_up_required, follow_up_date, cost, notes, dog:dogs(id, name)').eq('id', id).single()
  // Return { vetVisit, loading, error, refresh }
}
```

**For each screen above:** After creating the hook, update the screen to:
1. Remove the direct `supabase.from(...)` call
2. Import and call the new hook
3. Use `loading`, `error`, and `data` from the hook to render loading skeleton, error state, and populated content

---

## FIX 5 — Replace `SELECT *` with Explicit Column Lists

**Problem:** Using `select('*')` fetches unnecessary data and weakens TypeScript type inference.

Update these files to use explicit column selections:

### `hooks/useAdmin.ts`
Replace each `select('*')` with the columns actually used in the component that calls the hook:

```typescript
// Applications
.select('id, full_name, email, phone, status, purpose, country, created_at, admin_notes')

// Litters  
.select('id, name, status, expected_date, actual_date, go_home_date, puppy_count, available_count')

// Enquiries
.select('id, full_name, email, phone, subject, message, status, created_at, replied_at')

// Testimonials
.select('id, author_name, content, rating, is_published, sort_order, photo_url')

// Gallery items
.select('id, title, url, thumbnail_url, type, sort_order, is_published')

// FAQ
.select('id, question, answer, is_published, sort_order')

// Client groups
.select('id, name, type, description, colour, member_count, litter_id, created_at')
```

### `hooks/useContacts.ts`
```typescript
// Contacts list
.select('id, full_name, email, phone, tags, is_do_not_sell, first_contact_date, created_at')

// Single contact
.select('id, full_name, email, phone, address, tags, is_do_not_sell, popia_consent, notes, id_number, created_at')
```

### `hooks/useContent.ts`
```typescript
// Gallery
.select('id, title, url, thumbnail_url, type, sort_order, is_published')

// FAQ
.select('id, question, answer, is_published, sort_order')
```

### `app/(admin)/contracts/index.tsx` (before hook extraction in Fix 4a)
```typescript
// Contract templates
.select('id, name, body_html, created_at')
```

---

## FIX 6 — Add Error State to `useDog` Single-Record Hook

**Problem:** The `useDog(id)` hook has no `catch` block. If the fetch fails, the screen shows the loading state forever.

**File:** `hooks/useDogs.ts` — `useDog` function

Add error state:
```typescript
export function useDog(id: string) {
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ADD THIS

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null); // ADD THIS
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('dogs')
        .select('id, name, breed, colour, sex, status, date_of_birth, microchip_number, bloodline, description, temperament_notes, training_notes, health_tested, hip_score, elbow_score, dcm_status, price, is_public, is_featured, father_id, mother_id, dog_media(*)')
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message); // ADD THIS
      if (data) {
        const r = data as Record<string, unknown>;
        const media = (r.dog_media as Dog['media']) ?? [];
        setDog({ ...(r as Dog), media });
      }
    } catch (e) { // ADD THIS CATCH BLOCK
      setError(e instanceof Error ? e.message : 'Could not load dog profile');
      setDog(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  return { dog, loading, error, refresh }; // ADD error to return
}
```

Update any screen that calls `useDog` to handle the `error` return value — show an error card when `error` is not null.

---

## FIX 7 — Split Oversized Screen Files

### 7a: `app/(admin)/training/index.tsx` (490 lines → target <250 lines)

Extract these sections into separate component files:

- `components/Training/SessionTypeCard.tsx` — the card that shows a training session type
- `components/Training/BookingCard.tsx` — the card showing a training booking
- `components/Training/AvailabilitySlot.tsx` — the availability time slot display
- `components/Training/AddBookingSheet.tsx` — the bottom sheet form for adding a booking

The main `training/index.tsx` should only contain: imports, tab switching logic, FlatList renders using those components, and the hook calls.

### 7b: `app/(admin)/broadcast/new.tsx` (346 lines → target <250 lines)

Extract:
- `components/Broadcast/GroupSelector.tsx` — the client group selection UI
- `components/Broadcast/ChannelToggle.tsx` — WhatsApp/email/push toggle pills
- `components/Broadcast/PreviewCard.tsx` — message preview before sending

### 7c: `app/(admin)/quotes/new.tsx` (306 lines → target <250 lines)

Extract:
- `components/Finance/LineItemRow.tsx` — individual line item input row
- `components/Finance/LineItemList.tsx` — the list of line items with add/remove

---

## EXECUTION ORDER

Complete fixes in this exact order to avoid import errors:

1. **Fix 3 first** — Split `useMutations.ts`. All other files depend on mutations, so split this before touching anything else.
2. **Fix 6** — Add error state to `useDog` (simple, isolated change).
3. **Fix 2** — Replace N+1 query in `useLittersWithPuppies`.
4. **Fix 4** — Extract data fetching from screen files into hooks. Create hooks first, then update screens.
5. **Fix 5** — Replace `SELECT *` in hook files (do this while fixing Fix 4, touching the same files).
6. **Fix 7** — Split oversized screen files into components.
7. **Fix 1 LAST** — Fix the mock data in portal screens (depends on `usePortal.ts` hook from Fix 4 being in place).
8. Run `npx tsc --noEmit` — resolve all TypeScript errors.
9. Run the app with `npx expo start` and test:
   - Admin dashboard loads live data
   - Litters view loads in a single query (check network tab or Supabase logs)
   - Client portal shows empty state (no mock dogs)
   - Dog detail screen shows error card when offline

---

## TESTING CHECKLIST

Before marking this complete, verify:

- [ ] `app/(portal)/dashboard.tsx` — NO import from `@/lib/mockData`
- [ ] `app/(portal)/reservation.tsx` — NO import from `@/lib/mockData`
- [ ] `hooks/useMutations.ts` is under 40 lines (re-exports only)
- [ ] `lib/dogs/mutations.ts`, `lib/finance/mutations.ts`, `lib/clients/mutations.ts` each exist and are under 250 lines
- [ ] `useLittersWithPuppies` makes exactly ONE Supabase query (no `.map(async ...)`)
- [ ] None of the 9 listed screen files contain `supabase.from(` calls
- [ ] No `select('*')` in `useAdmin.ts`, `useContacts.ts`, or `useContent.ts`
- [ ] `useDog` returns an `error` field
- [ ] `app/(admin)/training/index.tsx` is under 250 lines
- [ ] `app/(admin)/broadcast/new.tsx` is under 250 lines
- [ ] `app/(admin)/quotes/new.tsx` is under 250 lines
- [ ] `npx tsc --noEmit` passes with zero errors

---

*End of Cursor Prompt — Code Quality & Architecture Fix*
*Diedericks Dobermanns | Production-Ready Cleanup Pass*
