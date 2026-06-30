# Diedericks Dobermanns App — Architecture & Risk Review
**Date:** June 2026 | **Reviewer:** Senior Software Architect (App Developer Skill + IT Manager perspective)

---

## Executive Summary

The foundation of this app is **solid**. The overall structure, security model, and separation of concerns are professional-grade. Cursor followed the prompts well on the big things. However, there are **one critical bug** that will cause problems in production, **four high-priority technical issues** that will make the app harder to maintain as it grows, and a handful of medium-priority items to clean up in Phase 10.

The good news: none of these are architectural disasters — they are fixable in one focused Cursor session. The architecture is sound enough to scale.

---

## 🔴 CRITICAL — Fix Before Going Live

### 1. Client Portal Shows Fake (Mock) Data in Production

**Files:** `app/(portal)/dashboard.tsx` and `app/(portal)/reservation.tsx`

**What's happening:** Two client-facing screens import `MOCK_DOGS` — the fake placeholder data used during demo/development — and use it **unconditionally**. This means when a real client logs into the app, they will see fabricated dogs (Zeus vom Diedericks, etc.) instead of their actual purchased dog.

```typescript
// THIS IS WRONG — in both portal screens right now:
import { MOCK_DOGS } from '@/lib/mockData';
const reservedDog = MOCK_DOGS.find((d) => d.status === 'reserved'); // Always fake data!
```

**What it should do:** Query the real `dogs` table from Supabase, filtered by the logged-in client's ownership.

**Risk:** A real client opens the app, sees "Zeus vom Diedericks" — a dog they did not buy. Trust is immediately destroyed.

**Fix for Cursor:**
```
In app/(portal)/dashboard.tsx and app/(portal)/reservation.tsx:
- Remove the MOCK_DOGS import entirely
- Replace with a real Supabase query: supabase.from('dogs').select(...).eq('owner_id', user.id)
- Show loading state while fetching, empty state if no dogs linked yet
```

---

## 🟠 HIGH PRIORITY — Fix in Next Cursor Session

### 2. N+1 Database Query in Litters View

**File:** `hooks/useDogs.ts` — `useLittersWithPuppies` function

**What's happening:** For every litter in the database, the code fires a **separate** database query to fetch that litter's puppies. This is called an N+1 problem — industry shorthand for a query pattern that gets exponentially slower as data grows.

```typescript
// CURRENT — fires 1 query per litter (waterfall):
const withPups = await Promise.all(
  (litterRows ?? []).map(async (l) => {
    const { data: pups } = await supabase.from('dogs').select('*').eq('litter_id', l.id);
    // ↑ This runs once for EACH litter
  })
);
// 10 litters = 11 database trips. 50 litters = 51 trips.
```

**What it should be:** One single query with a JOIN, fetching all litters and all their puppies in a single round-trip.

```typescript
// CORRECT — 1 query total:
const { data } = await supabase
  .from('litters')
  .select('*, puppies:dogs(id, name, sex, colour, status, dog_media(url, is_primary))')
  .order('actual_date', { ascending: false });
```

**Risk:** As the kennel grows (10, 20, 50 litters), this screen will visibly slow down. On a mobile connection in South Africa or Eswatini, this could take 5-10 seconds to load.

---

### 3. `useMutations.ts` is 734 Lines — Needs Splitting

**File:** `hooks/useMutations.ts`

**What's happening:** One single file handles database write operations for: dogs, dog media, quotes, invoices, waiting list, client groups, broadcasts, training — everything. At 734 lines it is already impossible to navigate and will only grow.

**Risk:** When something breaks (and something always eventually breaks), finding and fixing it in a 734-line file under pressure is a nightmare. It also means any change to any mutation requires touching this one critical file — high risk of introducing bugs.

**Fix for Cursor:** Split into domain files:
```
lib/
  dogs/mutations.ts        (saveDog, deleteDog, saveDogPedigree, replaceDogMedia)
  finance/mutations.ts     (saveQuote, createInvoiceFromQuote, recordPayment)
  clients/mutations.ts     (updateWaitlistEntry, createClientGroup, sendBroadcast)
  training/mutations.ts    (training-related mutations)
```

Each file should be under 200 lines.

---

### 4. Data Fetching Directly in 9 Screen Files

**What's happening:** Nine screen files are querying Supabase directly instead of using a custom hook. This is the anti-pattern we specifically wanted to avoid.

**Affected files:**
- `app/(admin)/contracts/index.tsx`
- `app/(admin)/documents/index.tsx`
- `app/(admin)/heats/index.tsx`
- `app/(admin)/litters/[id]/index.tsx`
- `app/(admin)/todos/index.tsx`
- `app/(tabs)/contacts/enquiries/[id].tsx`
- `app/(tabs)/dogs/litters/[id].tsx`
- `app/(tabs)/health/vaccinations/[id].tsx`
- `app/(tabs)/health/vet-visits/[id].tsx`

**Why it matters:** When logic lives in a screen file, you cannot reuse it, you cannot test it in isolation, and when something goes wrong at 10pm you have to dig through a UI file to find a database bug. The screen should only be concerned with layout and display.

**Fix for Cursor:** For each of these, extract the Supabase query into a custom hook (`useContracts`, `useDocuments`, `useHeats`, etc.) and have the screen call the hook.

---

### 5. `SELECT *` Used in 15+ Queries

**What's happening:** Queries in `useAdmin.ts`, `useContacts.ts`, `useContent.ts`, `documents/index.tsx`, `contracts/index.tsx`, and others fetch every column from every table with `select('*')`.

**Risk:** Two problems. First, it pulls unnecessary data over the network (your clients on mobile data pay for this). Second, when you add new columns to a table (especially large ones like blob data or JSON), these queries silently start fetching all of it without anyone noticing. Third, TypeScript cannot infer the return type properly, so errors slip through.

**Fix for Cursor:** Replace every `select('*')` with an explicit column list. Example:
```typescript
// Before:
supabase.from('applications').select('*')

// After:
supabase.from('applications').select('id, full_name, email, phone, status, created_at')
```

---

### 6. Three Screens Are Over the 300-Line Limit

| File | Lines | Problem |
|------|-------|---------|
| `app/(admin)/training/index.tsx` | 490 | Nearly double the limit |
| `app/(admin)/broadcast/new.tsx` | 346 | Over limit |
| `app/(admin)/quotes/new.tsx` | 306 | Over limit |

**Fix:** Extract form components and logic sections into sub-components in `components/Training/`, `components/Broadcast/`, `components/Finance/`.

---

## 🟡 MEDIUM PRIORITY — Address in Phase 10

### 7. Phase 10 Database Migration Has NOT Been Run Yet

**What this means:** The Phase 10 Cursor prompt (`CURSOR_PROMPT_DASHBOARD_AND_ALL_SCREENS.md`) included a required database migration adding:
- `contacts` table
- `vet_visits` table
- `deworming_records` table
- Genetics columns on `dogs` (`genetics_b_locus`, `genetics_d_locus`, `genetics_vwd_status`)

**These tables do not yet exist in Supabase.** When Cursor builds Phase 10 screens that query these tables, they will either crash or return empty results.

**Action:** Run the Phase 10 migration SQL first, then regenerate `database.types.ts` **before** giving Cursor the Phase 10 prompt to build screens.

Steps:
1. Open Supabase dashboard → SQL Editor
2. Paste and run the migration SQL from `CURSOR_PROMPT_DASHBOARD_AND_ALL_SCREENS.md` (Module 6 section)
3. Run: `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/database.types.ts`
4. Then give Cursor the Phase 10 prompt

---

### 8. `useDog` (Single Dog Hook) Has No Error State

**File:** `hooks/useDogs.ts` — `useDog` function

The hook for loading a single dog has a `try/finally` block but no `catch`. If the Supabase fetch fails, the screen will show the loading skeleton forever — the user sees a spinning/blank screen with no explanation.

**Fix:** Add error state:
```typescript
// Add inside useDog:
const [error, setError] = useState<string | null>(null);
// In the try/finally — add a catch:
} catch (e) {
  setError(e instanceof Error ? e.message : 'Could not load dog profile');
} finally {
  setLoading(false);
}
```

---

### 9. Calendar Will Need Date-Range Filtering as Data Grows

**File:** `hooks/useCalendarEvents.ts`

The calendar fetches all events from all tables (litters, heat cycles, vet visits, vaccinations, todos, training) without any date range filter. This is fine now with limited data. When you have 5 years of vet visit records, vaccination histories, and heat cycles, this will become slow.

**When to fix:** Not urgent now, but when the calendar feels slow, add `.gte('event_date', sixMonthsAgo).lte('event_date', sixMonthsAhead)` to each query.

---

## ✅ What Is Working Correctly

These things are done right and should **not** be changed:

| Item | Why It's Good |
|------|--------------|
| `.env` is in `.gitignore` | Credentials are protected from being accidentally committed to git |
| Bundle ID: `com.diedericksdobermanns.app` | Correct (single 'i') — App Store & Play Store ready |
| `SERVICE_ROLE_KEY` only in Edge Functions | Never exposed to client — critical security practice ✅ |
| `AuthGuard` with role checking on all admin routes | Properly blocks unauthorized access at the navigation level |
| `SecureStorageAdapter` for JWT tokens | Auth tokens stored in encrypted device storage, not plain AsyncStorage |
| Dashboard screen = 12 lines | Perfect — delegates entirely to `AdminDashboardContent` component |
| Realtime subscriptions on dashboard | Live updates when todos/enquiries/heats change — feels premium |
| `lib/genetics/punnett.ts` — pure TypeScript | Business logic isolated, no Supabase dependency, testable |
| Finance module: `lib/finance/queries.ts` | Properly separated from UI |
| Edge Functions for video rooms, email, push, WhatsApp | Server-side secrets properly protected |
| Optimistic UI on todo completion | Dashboard responds instantly, rolls back on failure — professional UX |

---

## Supabase Architecture Assessment

**Overall rating: Sound foundation, minor execution gaps.**

The Supabase setup is architecturally correct:
- RLS helper functions `is_admin()` and `is_trainer_or_above()` are the right pattern
- Using the anon key on client + RLS for authorization is correct
- Edge Functions handle everything that needs the service role key
- Realtime subscriptions are used appropriately (dashboard, not everywhere)
- SecureStorageAdapter means auth sessions survive app restarts securely

**The one Supabase concern:** The `database.types.ts` file in the `types/` folder inside the app is from an earlier migration. It does not include the tables added in Phase 10 (contacts, vet_visits, deworming_records) or the genetics columns on dogs. This means TypeScript type-checking is silently wrong for those tables. Regenerate types after running the Phase 10 migration.

---

## Recommended Action Plan for Cursor

### Session 1 — Critical Fix (30 minutes)
Give Cursor this single focused prompt:

> Fix the portal dashboard: `app/(portal)/dashboard.tsx` and `app/(portal)/reservation.tsx` are importing MOCK_DOGS and showing fake data. Replace with real Supabase queries to `dogs` table filtered by the logged-in user's ID. Add loading and empty states. Remove all MOCK_DOGS imports from these files.

### Session 2 — Code Quality Pass (1-2 hours)
Give Cursor the following in one prompt:

1. Fix N+1 in `useLittersWithPuppies` — use a single JOIN query
2. Split `useMutations.ts` (734 lines) into domain files under `lib/`
3. Move data fetching out of 9 screen files into custom hooks
4. Replace `select('*')` with explicit column lists in `useAdmin.ts` and `useContent.ts`
5. Split `training/index.tsx` (490 lines) into components

### Session 3 — Phase 10 Build
1. Run Phase 10 migration in Supabase
2. Regenerate `database.types.ts`
3. Give Cursor `CURSOR_PROMPT_DASHBOARD_AND_ALL_SCREENS.md`

---

## Bottom Line

This is a **well-structured app** built on the right foundations. The security model is correct, the routing is clean, the better hooks follow the right pattern, and the database design is solid. The issues identified are typical of AI-assisted development moving fast — Cursor got the architecture right in most places but cut corners on a handful of screens. Two focused Cursor sessions will bring this to production-quality standard.

The mock data bug in the client portal is the only thing that must be fixed before showing this to any real client.

---

*Architecture Review completed by Senior Software Architect | Diedericks Dobermanns App | June 2026*
