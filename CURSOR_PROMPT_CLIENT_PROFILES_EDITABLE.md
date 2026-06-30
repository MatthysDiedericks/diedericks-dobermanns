# Cursor Prompt — Client Portal: Editable Dog Profile + Customer Profile

## Stack Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

---

## What Already Exists — Read Before Starting

| File | Current state |
|------|--------------|
| `app/(portal)/puppy-tracker/[puppyId].tsx` | Read-only: shows dog info, vaccinations, training logs, story |
| `app/(portal)/profile.tsx` | Read-only: shows name, phone, role — NO editing |
| `app/(portal)/add-photos/[dogId].tsx` | Already works — photo upload for a dog |
| `hooks/useDogs.ts` | `useDog(id)` — fetches dog record |
| `hooks/useRecords.ts` | `useVaccinations`, `useTrainingLogs`, `useDogTimeline` |
| `stores/authStore.ts` | `useAuthStore` — holds `profile` object |

### Ownership rule
- Admin owns and controls: dog name, colour, sex, DOB, pedigree, vaccinations, health records, training data, microchip
- Client can update: their own personal notes about the dog, nickname they use, their vet contact details for this dog
- Client can update their OWN account: full name, phone, WhatsApp, address, experience, purpose, emergency contact, vet details

---

## TASK 1 — Database migration (apply first)

Apply migration `0016_client_profiles_dog_notes.sql`:

```sql
-- Client-editable overlay on a dog they own
-- Does NOT affect the core dogs table — admin data is protected
CREATE TABLE IF NOT EXISTS client_dog_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  nickname text,                    -- what the client calls the dog at home
  personal_notes text,              -- client's own observations about the dog
  vet_practice text,                -- vet practice name for this dog
  vet_name text,                    -- vet name for this dog
  vet_phone text,                   -- vet phone for this dog
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, dog_id)         -- one record per client-dog pair
);

ALTER TABLE client_dog_notes ENABLE ROW LEVEL SECURITY;

-- Client can read and write only their own notes
CREATE POLICY "client own dog notes" ON client_dog_notes
  FOR ALL USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- Admin can read all
CREATE POLICY "admin read dog notes" ON client_dog_notes
  FOR SELECT USING (public.is_admin());

-- Extend users table for full client profile (if not done by migration 0015)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS dog_experience text,
  ADD COLUMN IF NOT EXISTS current_pets text,
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS has_fencing boolean,
  ADD COLUMN IF NOT EXISTS purpose text[],
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS vet_practice text,
  ADD COLUMN IF NOT EXISTS vet_name text,
  ADD COLUMN IF NOT EXISTS vet_phone text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

-- RLS: clients can update their own user row
CREATE POLICY IF NOT EXISTS "client update own profile" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

---

## TASK 2 — Create `hooks/useClientProfile.ts`

New hook file for client profile read + update:

```ts
import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { TablesUpdate } from '@/types/database.types'

export interface ClientProfileUpdate {
  full_name?: string
  phone?: string
  whatsapp_number?: string
  address?: string
  country?: string
  dog_experience?: string
  current_pets?: string
  has_children?: boolean
  property_type?: string
  has_fencing?: boolean
  purpose?: string[]
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  vet_practice?: string
  vet_name?: string
  vet_phone?: string
}

export function useClientProfile() {
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (patch: ClientProfileUpdate) => {
    if (!profile?.id) return
    setSaving(true)
    setError(null)
    try {
      const supabase = requireSupabase()

      // Mark profile completed if all core fields are now filled
      const merged = { ...profile, ...patch }
      const isComplete =
        !!merged.full_name && !!merged.phone && !!merged.address && !!merged.dog_experience
      const payload: TablesUpdate<'users'> = {
        ...patch,
        ...(isComplete && !profile.profile_completed_at
          ? { profile_completed_at: new Date().toISOString() }
          : {}),
      }

      const { data, error: err } = await supabase
        .from('users')
        .update(payload)
        .eq('id', profile.id)
        .select()
        .single()
      if (err) throw new Error(err.message)
      setProfile(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile')
      throw e
    } finally {
      setSaving(false)
    }
  }, [profile, setProfile])

  const isComplete = !!(
    profile?.full_name &&
    profile?.phone &&
    profile?.address &&
    profile?.dog_experience
  )

  return { profile, save, saving, error, isComplete }
}
```

---

## TASK 3 — Create `hooks/useClientDogNotes.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface ClientDogNotes {
  id: string
  client_id: string
  dog_id: string
  nickname: string | null
  personal_notes: string | null
  vet_practice: string | null
  vet_name: string | null
  vet_phone: string | null
  updated_at: string
}

export interface ClientDogNotesUpdate {
  nickname?: string
  personal_notes?: string
  vet_practice?: string
  vet_name?: string
  vet_phone?: string
}

export function useClientDogNotes(dogId: string) {
  const profile = useAuthStore((s) => s.profile)
  const [notes, setNotes] = useState<ClientDogNotes | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!profile?.id || !dogId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const supabase = requireSupabase()
      const { data, error: err } = await supabase
        .from('client_dog_notes')
        .select('*')
        .eq('client_id', profile.id)
        .eq('dog_id', dogId)
        .maybeSingle()
      if (err) throw new Error(err.message)
      setNotes(data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, dogId])

  useEffect(() => { refresh() }, [refresh])

  const save = useCallback(async (patch: ClientDogNotesUpdate) => {
    if (!profile?.id || !dogId) return
    setSaving(true)
    setError(null)
    try {
      const supabase = requireSupabase()
      const { data, error: err } = await supabase
        .from('client_dog_notes')
        .upsert(
          { client_id: profile.id, dog_id: dogId, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'client_id,dog_id' }
        )
        .select()
        .single()
      if (err) throw new Error(err.message)
      setNotes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      throw e
    } finally {
      setSaving(false)
    }
  }, [profile?.id, dogId])

  return { notes, loading, saving, error, save, refresh }
}
```

---

## TASK 4 — Upgrade `app/(portal)/puppy-tracker/[puppyId].tsx`

Replace with a full editable dog profile. Keep under 280 lines — extract sections into components.

### Layout:

**Hero** (top)
- Full-width photo carousel (existing `PublicPhotoGallery` — keep)
- Dog name in Cinzel font, gold, overlaid on gradient at bottom of hero image
- Nickname in parentheses if set: `Hunter (Hunny)`
- Age + DOB pill
- "+ ADD PHOTOS" ghost button below hero

**Tabs** (horizontal: INFO | HEALTH | TRAINING | MY NOTES)

**INFO tab:**
```
[SECTION: Dog Details]  ← read-only, admin-controlled
  Registered Name    Hunter
  Call Name / Colour Black & Tan
  Sex                Male
  Date of Birth      14 March 2024
  Age                1 year, 3 months
  Microchip          123456789012345  (if set)
  Sire               [link to pedigree if available]
  Dam                [link to pedigree if available]

[SECTION: Your Vet — editable]
  Practice Name      [text input]
  Vet's Name         [text input]
  Phone              [text input]
  [SAVE VET DETAILS button]

[SECTION: Your Nickname for This Dog — editable]
  What do you call [Hunter] at home?
  [text input — single line]
  [SAVE]
```

**HEALTH tab:**
- Vaccination list (existing — keep)
- Upcoming reminders: highlight any `next_due_date` within 60 days in amber
- Each row: vaccine name, date given, next due date, badge: UP TO DATE / DUE SOON / OVERDUE

**TRAINING tab:**
- Recent training logs (existing — keep, up to 10)
- "VIEW ALL UPDATES" button → `/(portal)/training-updates/${dog.id}`
- "SUBMIT VIDEO FOR REVIEW" button → `/(portal)/training/video-review`

**MY NOTES tab:**
```
Your personal notes about [Hunter]
These are private to you — not visible to the kennel.

[Large multiline text area — min 6 lines]

[SAVE NOTES button]
```

### Implementation:

```tsx
// Use tab state: 'info' | 'health' | 'training' | 'notes'
// Each tab is a separate sub-component to stay under 280 lines

// Sub-components to create:
//   components/portal/DogProfileHero.tsx         ← photo carousel + name overlay
//   components/portal/DogInfoTab.tsx             ← dog details + vet + nickname fields
//   components/portal/DogHealthTab.tsx           ← vaccination list with status badges
//   components/portal/DogTrainingTab.tsx         ← training logs + action buttons
//   components/portal/DogNotesTab.tsx            ← personal notes textarea

// Screen file: just the tab layout + hook calls
```

**Key rules:**
- Admin-controlled fields (name, colour, sex, DOB, pedigree, microchip, vaccinations, training) are **read-only** in this view — displayed as `<Typography>`, never `<TextInput>`
- Client-editable fields: nickname, vet details, personal notes — use `<TextInput>` with save button
- Save uses `useClientDogNotes().save()` for dog-specific fields
- "Nickname" and "vet details" save on button press, not on blur (avoid accidental saves)
- "MY NOTES" tab: auto-saves with 1-second debounce OR a manual SAVE button — use manual SAVE for clarity
- Show "Last updated [date]" below the notes if notes exist

---

## TASK 5 — Upgrade `app/(portal)/profile.tsx`

Replace the read-only screen with a fully editable profile. Keep under 260 lines — use section components.

### Sections (each has its own SAVE button — section-level save):

**PERSONAL DETAILS**
```
Full Name*          [text input — pre-filled from profile]
Email               [read-only — from auth, not editable]
Phone*              [text input]
WhatsApp            [text input — leave blank if same as phone]
Country / Region*   [text input]
Address*            [multiline text input]
```

**DOBERMANN EXPERIENCE**
```
Your experience:
  [ ] First-time owner
  [ ] Previously owned a Dobermann
  [ ] Current / multiple owner
  [ ] Professional handler / trainer
  (radio — single select, stored as dog_experience string)

Current pets:       [text — "2 cats, 1 labrador"]
Children at home:   [Yes / No toggle]
Property type:      [House with yard | Smallholding | Farm | Apartment] (radio)
Security fencing:   [Yes / No toggle]
```

**YOUR PURPOSE**
```
Why are you interested in a Dobermann? (select all that apply)
  [ ] Family companion
  [ ] Personal protection
  [ ] Sport / PSA / IPO
  [ ] Show / breeding
  [ ] Business / security protection
(multiselect checkboxes — stored as purpose text[])
```

**EMERGENCY CONTACT**
```
Name                [text input]
Phone               [text input]
Relationship        [text input]
```

**VETERINARIAN**
```
Practice name       [text input]
Vet's name          [text input]
Phone               [text input]
```

**ACCOUNT**
```
Role                [read-only — client]
Member since        [read-only — profile.created_at formatted]
[SIGN OUT button — danger variant]
```

### Profile completion banner:
At the top, if `isComplete` is false:
```
⚠ Your profile is incomplete
Complete your details to unlock all features and allow us to serve you better.
[percentage bar — count filled required fields / total required]
```

If complete, show:
```
✓ Profile complete — thank you, [FirstName]
```

### Implementation notes:
- Use `useClientProfile()` hook (Task 2)
- Each section saves independently via its own SAVE button
- Show loading spinner on the SAVE button while `saving = true`
- Toast on success: "Saved ✓" (use existing toast utility)
- Toast on error: "Could not save — try again"
- Pull-to-refresh not needed (data is from authStore, already in memory)

---

## TASK 6 — Link from Dashboard

In `app/(portal)/dashboard.tsx`:

1. The dog card should navigate to `/(portal)/puppy-tracker/${dog.id}` — verify this link already exists and works
2. Profile tab in the bottom nav already goes to `/(portal)/profile` — no change needed
3. Add a "EDIT PROFILE" shortcut in the Quick Links grid (replace "My Application" if the client has been approved):
```ts
{ href: '/(portal)/profile', icon: 'person-circle-outline' as const, label: 'My Profile' },
```

---

## FILE STRUCTURE

```
supabase/migrations/
  0016_client_profiles_dog_notes.sql     ← CREATE (Task 1)

hooks/
  useClientProfile.ts                    ← CREATE (Task 2)
  useClientDogNotes.ts                   ← CREATE (Task 3)

app/(portal)/
  puppy-tracker/[puppyId].tsx            ← UPGRADE — tabbed editable dog profile (Task 4)
  profile.tsx                            ← UPGRADE — full editable customer profile (Task 5)

components/portal/
  DogProfileHero.tsx                     ← CREATE (Task 4)
  DogInfoTab.tsx                         ← CREATE (Task 4)
  DogHealthTab.tsx                       ← CREATE (Task 4)
  DogTrainingTab.tsx                     ← CREATE (Task 4)
  DogNotesTab.tsx                        ← CREATE (Task 4)
  ProfileSection.tsx                     ← CREATE reusable section wrapper with title + save button (Task 5)
```

---

## PERMISSION BOUNDARIES — STRICTLY ENFORCE

| Field | Who controls it | Editable in portal |
|-------|----------------|-------------------|
| Dog name | Admin only | NO — display only |
| Dog DOB / colour / sex | Admin only | NO — display only |
| Pedigree (sire / dam) | Admin only | NO — display only |
| Microchip number | Admin only | NO — display only |
| Vaccinations | Admin only | NO — display only |
| Training logs | Admin only | NO — display only |
| Dog nickname | Client | YES |
| Dog vet details | Client | YES |
| Dog personal notes | Client | YES — private to client |
| Client full name / phone | Client | YES |
| Client address / country | Client | YES |
| Client dog experience | Client | YES |
| Client emergency contact | Client | YES |
| Client vet details | Client | YES |
| Client email | Auth system | NO — display only |
| Client role | Admin only | NO — display only |

---

## CRITICAL WARNINGS

- NEVER allow clients to write to the `dogs` table — all dog edits go to `client_dog_notes`
- NEVER expose another client's notes — `client_dog_notes` RLS filters by `client_id = auth.uid()`
- Profile save must `.eq('id', profile.id)` — never update without that filter
- `purpose` is stored as a `text[]` array in PostgreSQL — pass as a JS `string[]`
- `has_children` and `has_fencing` are booleans — render as Yes/No toggle, not text
- Keep each file under 300 lines — use the sub-components defined above
- Do NOT change `useDog()`, `useVaccinations()`, `useTrainingLogs()` — they are correct

---

## TESTING CHECKLIST

**Dog Profile (puppy-tracker)**
- [ ] Hero photo carousel loads with dog name overlay
- [ ] Tabs navigate correctly: INFO / HEALTH / TRAINING / MY NOTES
- [ ] INFO tab shows admin-controlled fields as text (not inputs)
- [ ] Vet details fields save to `client_dog_notes` table correctly
- [ ] Nickname saves and displays in hero as `Hunter (Hunny)`
- [ ] HEALTH tab shows vaccinations with DUE SOON badge if next_due_date < 60 days
- [ ] TRAINING tab shows recent logs + links to training-updates screen
- [ ] MY NOTES tab loads existing notes and saves new ones
- [ ] Notes are private — not visible to admin in the dog detail screen
- [ ] "+ ADD PHOTOS" navigates to `add-photos/[dogId]`

**Customer Profile**
- [ ] All fields pre-filled from existing `users` record
- [ ] Each section saves independently
- [ ] SAVE button shows loading state, disables during save
- [ ] Email field is read-only
- [ ] Role field is read-only
- [ ] Profile completion banner appears when fields are missing
- [ ] Banner disappears / shows ✓ when all required fields are filled
- [ ] Purpose multiselect correctly reads/writes the `text[]` array

**General**
- [ ] No TypeScript errors — `npx tsc --noEmit` passes
- [ ] No file over 300 lines
- [ ] Pull-to-refresh on dog profile works
- [ ] No other client's data accessible
