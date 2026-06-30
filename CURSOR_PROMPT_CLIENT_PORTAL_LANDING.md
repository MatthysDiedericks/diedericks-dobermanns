# Cursor Prompt — Client Portal: Landing Page + Missing Features

## Stack Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

---

## WHAT ALREADY EXISTS — DO NOT REBUILD

Before touching anything, read these existing files:

| File | What it does |
|------|-------------|
| `app/(portal)/dashboard.tsx` | Basic landing: welcome, dogs, quick links |
| `app/(portal)/reservation.tsx` | Active reservation with dog photo + financial details |
| `app/(portal)/profile.tsx` | Shows name/email/phone — READ ONLY, no edit |
| `app/(portal)/training/index.tsx` | Full booking flow — session type → date → admin slot → confirm ✅ |
| `app/(portal)/training/bookings.tsx` | My sessions list with video call join + session media |
| `app/(portal)/messages.tsx` | Messaging screen |
| `app/(portal)/documents.tsx` | Client documents |
| `app/(portal)/notifications.tsx` | Notifications with unread badge |
| `app/(portal)/application-status.tsx` | Application status screen |
| `app/(portal)/puppy-tracker/[puppyId].tsx` | Puppy profile view |
| `app/(portal)/training-updates/[dogId].tsx` | Training progress updates |
| `app/(portal)/add-photos/[dogId].tsx` | Photo upload for a dog |
| `app/(portal)/contracts.tsx` | Contracts |
| `app/(portal)/invoices/` | Invoices |
| `hooks/usePortal.ts` | usePortalDogs, usePortalReservation, useContracts, useMyApplications |
| `hooks/useTraining.ts` | useAvailability, useSessionTypes, useMyDogs, useClientBookings |

**NOTE:** Training bookings are ALREADY admin-controlled. The `training/index.tsx` reads from `training_availability` table, only shows non-blocked slots with capacity. Do NOT change this flow.

---

## LOGO SETUP (DO FIRST)

The Diedericks Dobermanns monogram logo is already in the project at `assets/monogram-source.png` — use this file directly.

**In all portal components, use the logo like this:**
```tsx
import { Image } from 'expo-image'

<Image
  source={require('@/assets/monogram-source.png')}
  style={{ width: 80, height: 80 }}
  contentFit="contain"
/>
```

Do NOT create a placeholder or SVG fallback — the real file exists.

---

## TASK 1 — Rebuild `app/(portal)/dashboard.tsx`

Replace with a premium landing page. Keep under 200 lines — all logic in hooks.

### Layout (top to bottom):

**Hero Section**
```
[DD Monogram — require('@/assets/monogram-source.png') — 80×80, centered]
DIEDERICKS DOBERMANNS          ← Cinzel font, gold, text-2xl, centered
Born With Purpose. Built With Discipline.  ← caption, muted, centered
────────────────────────────────────────── ← thin gold divider
Good [morning/afternoon/evening], [FirstName]  ← time-aware, text-xl
Welcome to your private portal.            ← caption, muted
```

Time-aware greeting:
```ts
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
```

**Profile Completion Banner** (show only if profile is incomplete)
```
⚠ Complete your profile to unlock all features → [Complete Now]
```
Profile is "complete" if: full_name, phone, address, and dog_experience are all filled in.

**Application Status Strip** (if application exists)
- pending → amber: "📋 Application received — under review"
- under_review → gold: "🔍 Your application is being reviewed"
- approved → green: "✅ Approved — a reservation is being arranged"
- waitlisted → gold: "📋 You are #[N] on our waiting list"

**My Dog(s) Section**
- Full-width card per dog (if multiple → horizontal FlatList)
- Dog photo as background (220px, rounded-2xl, dark gradient overlay bottom)
- Name + colour + sex overlaid on photo (Cinzel, gold)
- Two buttons over image: `PROFILE` → puppy-tracker | `TRAINING` → training-updates
- Badges below: vaccination status chip + next due date

**Vaccination Reminder Strip** (if any vaccine due within 60 days)
```
💉 UPCOMING HEALTH EVENTS
[Hunter] · Rabies · Due in 12 days   [orange]
[Hunter] · DHPPiL · Due in 45 days   [gold]
```
Pull from `vaccinations` WHERE dog_id IN (client's dogs) AND next_due_date <= today + 60 days

**Reservation Card** (only if active reservation exists)
- Puppy photo (circular, 64px) + name + go-home date + days countdown
- Payment row: deposit paid ✓ / balance due ⚠
- CTA: VIEW RESERVATION

**Waitlist Card** (only if on waitlist)
- Position number prominently (#2)
- Litter: Sire × Dam + expected date
- CTA: CONTACT US

**Available Dogs** (always visible — shows dogs available to reserve)
- Section heading: "AVAILABLE FOR RESERVATION"
- Horizontal scroll of dog cards (photo, name, colour, sex, price if set)
- Tap → opens dog public profile
- Query: `dogs WHERE status = 'available' OR (status = 'keep' AND is_featured = true)` — adjust based on actual availability field
- Empty state: "No dogs available right now — join our waiting list"

**Training Quick Access**
- Card: 🏋 TRAINING SESSIONS
- Shows next upcoming booking date if one exists
- "BOOK A SESSION" button → `/(portal)/training/index`
- "SUBMIT VIDEO FOR REVIEW" button → new video submission screen (see Task 4)

**Quick Links Grid** (2×3 grid)
```
[📄 Documents]   [📃 Contracts]
[🔔 Alerts]      [💬 Messages]
[🧬 Pedigree]    [📷 Add Photos]
```

---

## TASK 2 — Upgrade `app/(portal)/profile.tsx`

The current profile is read-only. Replace with an editable profile that clients complete when they join.

### Profile fields:

```
PERSONAL
  Full name*
  Email (read-only — from auth)
  Phone*
  WhatsApp number (if different from phone)
  Country / Region*
  Physical address (street, city, province)*

YOUR DOBERMANN EXPERIENCE
  Experience with Dobermanns:
    [ First-time owner ]
    [ Previously owned a Dobermann ]
    [ Current / multiple Dobermann owner ]
    [ Professional handler / trainer ]
  
  Current pets (text — "2 cats, 1 labrador")
  Children at home: [ Yes / No ]
  Property type: [ House with yard ] [ Smallholding ] [ Farm ] [ Apartment ]
  Security fencing: [ Yes / No ]

YOUR PURPOSE
  Why are you interested in a Dobermann?
  [ Family companion ]
  [ Personal protection ]
  [ Sport / PSA / IPO ]
  [ Show / breeding ]
  [ Security / business protection ]
  (multiselect, user can select multiple)

EMERGENCY CONTACT
  Name
  Phone
  Relationship

VETERINARIAN
  Practice name
  Vet name
  Phone
```

Each section saves independently (section-level save buttons or auto-save on blur).

After profile is completed → show green "Profile complete ✓" badge on dashboard.

Store all in the `users` table (add columns if missing via migration):
```sql
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
```

---

## TASK 3 — New Screen: Pedigree View

Create `app/(portal)/pedigree/[dogId].tsx`

Show the dog's 3-generation pedigree in a visual tree:

```
              [DOG NAME]
            /            \
      [SIRE]             [DAM]
      /    \             /    \
[Pat.Sire] [Pat.Dam] [Mat.Sire] [Mat.Dam]
```

Each node: name + titles (if any). Gold for sire side, silver for dam side.

Query: join dogs table recursively up 3 levels using sire_id / dam_id.

Add link to pedigree from: dashboard Quick Links AND puppy-tracker/[puppyId].tsx

---

## TASK 4 — New Feature: Video Submission for Trainer Review

This is entirely new. Client uploads a 3–5 minute training video → trainer watches it and replies with written advice or a response video.

### Database (apply migration first):
```sql
CREATE TABLE IF NOT EXISTS training_video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id),
  dog_id uuid REFERENCES dogs(id),
  title text NOT NULL,
  description text,
  video_storage_path text NOT NULL,
  video_public_url text,
  duration_seconds int,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'reviewed')),
  trainer_response text,
  trainer_response_video_url text,
  trainer_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_video_submissions ENABLE ROW LEVEL SECURITY;

-- Client can only see their own submissions
CREATE POLICY "client own submissions" ON training_video_submissions
  FOR ALL USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- Trainers and admins can see all
CREATE POLICY "staff all submissions" ON training_video_submissions
  FOR ALL USING (public.is_trainer_or_above()) WITH CHECK (public.is_trainer_or_above());
```

### Client-side: `app/(portal)/training/video-review.tsx`

**Upload flow:**
1. Screen title: "SUBMIT TRAINING VIDEO"
2. Subtitle: "Upload a 3–5 minute video of your training session. Our trainer will review and reply with personalised advice within 48 hours."
3. Dog picker (their linked dogs)
4. Title field: "What are you working on?" (e.g. "Heel command — keeps pulling")
5. Description: "Describe what you've tried and where you're struggling" (multiline)
6. Video picker button: uses `expo-image-picker` with `mediaTypes: 'Videos'`
   - Show video duration after selecting
   - Warn if > 5 minutes: "Please keep videos under 5 minutes for faster review"
   - Show thumbnail preview after selection
7. SUBMIT button → uploads video to Supabase Storage bucket `training-videos/{userId}/{timestamp}_{filename}` → inserts record
8. Success state: "✓ Submitted! Your trainer will respond within 48 hours."

**Submissions list (add tab or section to `training/bookings.tsx`):**
- Show existing submissions with status badges:
  - PENDING → amber "Awaiting review"
  - UNDER REVIEW → blue "Trainer is reviewing"
  - REVIEWED → green "Trainer has responded"
- For REVIEWED submissions: show trainer's written response in a gold-bordered card
- If trainer attached a response video: show thumbnail + play button

**Admin side** (add to admin training screens — `app/(admin)/training/video-reviews.tsx`):
- List all pending video submissions
- Tap → play the video (using `expo-av` Video component)
- Text field: "Trainer Response" (multiline)
- Optional: upload response video
- "Mark as Reviewed" button → updates status, saves response, sends notification to client

---

## TASK 5 — Available Dogs Section (Query)

In `hooks/usePortal.ts`, add:

```ts
export function useAvailableDogs() {
  // Dogs that are available for clients to reserve
  // Use dogs where a "available_for_sale" flag or status indicates availability
  // Check actual dogs table columns — look for: status, is_available, available_for_reservation
  // Fallback: show is_featured dogs as "ambassador dogs" with enquiry button
  return useRemoteList<Dog>([], (client) =>
    client
      .from('dogs')
      .select('id, name, colour, sex, status, date_of_birth, is_featured, dog_media(url, is_primary)')
      .eq('is_featured', true)
      .in('status', ['keep', 'stud'])
      .order('name')
  )
}
```

---

## TASK 6 — Quotes Screen

Create `app/(portal)/quotes.tsx` (add to hidden routes in `_layout.tsx`).

```ts
// Query: quotes/invoices table WHERE client_id = userId AND type = 'quote'
// Show: quote title, amount, valid until date, status (pending/accepted/declined/expired)
// CTA: "Accept Quote" → updates status, triggers reservation flow
// Add link from dashboard quick links grid
```

Add "Quotes" to the Quick Links grid on the dashboard, replacing one of the less-used links.

---

## TASK 7 — Portal Navigation Updates

In `app/(portal)/_layout.tsx`:
- Keep existing tabs: Home | Reservation | Messages | Documents | Alerts | Profile
- Add to hidden routes:
  - `training/video-review` — video submission screen
  - `pedigree/[dogId]` — pedigree view
  - `quotes` — quotes screen

In `app/(portal)/training/bookings.tsx`:
- Add a second tab or section: "VIDEO REVIEWS" alongside "MY SESSIONS"
- Or: add a "Submit Video" button at the top that navigates to the video-review screen

---

## FILE STRUCTURE

```
app/(portal)/
  dashboard.tsx                     ← REBUILD (Task 1)
  profile.tsx                       ← UPGRADE (Task 2)
  pedigree/[dogId].tsx              ← CREATE (Task 3)
  training/
    index.tsx                       ← DO NOT CHANGE (already correct)
    bookings.tsx                    ← ADD video reviews section (Task 4)
    video-review.tsx                ← CREATE (Task 4)
  quotes.tsx                        ← CREATE (Task 6)

app/(admin)/training/
  video-reviews.tsx                 ← CREATE (Task 4 — admin side)

components/portal/
  PortalHero.tsx                    ← Logo + greeting
  MyDogCard.tsx                     ← Dog photo card with gradient overlay
  ReservationCard.tsx               ← Active reservation widget
  WaitlistCard.tsx                  ← Waitlist position widget
  AvailableDogsRow.tsx              ← Horizontal scroll of available dogs
  VaccinationReminderStrip.tsx      ← Upcoming health events
  TrainingAccessCard.tsx            ← Book session + submit video
  QuickLinksGrid.tsx                ← 2×3 icon grid

hooks/
  useClientPortal.ts                ← New combined hook for dashboard
  useAvailableDogs.ts               ← Available dogs query (add to usePortal.ts)
  useVideoSubmissions.ts            ← Video review queries

supabase/migrations/
  0015_profile_fields_video_subs.sql ← ALTER TABLE users + CREATE training_video_submissions
```

---

## CRITICAL WARNINGS

- DO NOT change `training/index.tsx` or `training/bookings.tsx` booking logic — it's already admin-controlled and working
- The monogram logo is at `assets/monogram-source.png` — use this path, do NOT change it
- Video uploads to Supabase Storage bucket `training-videos` — create the bucket if it doesn't exist (set to private, use signed URLs for playback)
- Video playback uses `expo-av` — already in Expo SDK 56, no separate install needed
- Client queries MUST filter by `client_id = userId` — never fetch all clients' data
- Profile edits go to `users` table — ensure RLS allows clients to update their own row only
- Max video file size guidance: 500MB Supabase Storage free tier limit per upload

---

## TESTING CHECKLIST

- [ ] DD monogram renders on dashboard hero (assets/monogram-source.png)
- [ ] Greeting is time-aware and uses client's first name
- [ ] Profile completion banner shows for incomplete profiles
- [ ] Dog card shows photo with gradient overlay, name in Cinzel gold
- [ ] Vaccination reminder strip shows upcoming health events (within 60 days)
- [ ] Reservation card only shows if active reservation exists
- [ ] Available dogs section shows featured dogs with enquiry flow
- [ ] Training quick access shows next booking + video submission button
- [ ] Quick links grid navigates correctly (6 links)
- [ ] Profile screen has all new fields, saves correctly per section
- [ ] Pedigree view shows 3-generation tree for linked dog
- [ ] Video submission: can pick video, see duration, upload, get success confirmation
- [ ] Video submission list shows status badges and trainer responses
- [ ] Admin video reviews screen shows pending submissions, can respond
- [ ] Client receives notification when trainer responds to video
- [ ] Quotes screen shows client's quotes with accept/decline
- [ ] Pull-to-refresh works on dashboard
- [ ] No other client's data ever visible
- [ ] No TypeScript errors — `npx tsc --noEmit` passes
- [ ] No file over 300 lines
