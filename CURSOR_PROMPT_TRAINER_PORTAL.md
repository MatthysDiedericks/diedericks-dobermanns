# CURSOR PROMPT — TRAINER PORTAL

## Context

App: Diedericks Dobermanns
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
Supabase: nlmwxodvquwbjinhhbmr
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

Currently the app has three navigation areas:
- `(public)` — visitor area, no auth
- `(portal)` — client area, role: client
- `(tabs)` + `(admin)` — admin area, roles: admin, super_admin, management

**What is missing:** A dedicated `(trainer)` route group for users with role `trainer`. Trainers need to see their assigned bookings, log session notes, upload session media, and mark sessions complete. They should NOT see finance, litters, breeding, or CRM data.

The `(tabs)` layout already partially supports trainers (it lists `trainer` in AuthGuard roles), but trainers see all admin tabs including Finance, Contacts, Documents — which they must not access. We need a clean, focused trainer experience.

Existing DB tables relevant to trainers (all already exist — do NOT create new migrations unless absolutely required):
- `training_bookings` — id, dog_id, client_id, trainer_id, session_type, scheduled_at, duration_minutes, status, notes, video_room_url, video_host_url
- `training_dogs` — dog_id, trainer_id, training_type, progress_notes, completed_milestones
- `dog_media` — id, dog_id, url, thumbnail_url, type ('photo'|'video'), label, sort_order
- `dogs` — id, name, status ('in_training'), colour

Existing hooks to reuse:
- `hooks/useTraining.ts` — training bookings + session types
- `hooks/useDogMedia.ts` — upload + list dog media

---

## TASK 1 — Create the (trainer) Route Group

Create folder: `app/(trainer)/`

Create: `app/(trainer)/_layout.tsx`

```typescript
// Trainer-only navigation. Shows only what a trainer needs:
// their bookings for today/this week, the dog assigned to each,
// and the ability to log notes + upload session media.
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { tabBarTheme } from '@/constants/navTheme';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function TrainerLayout() {
  return (
    <AuthGuard roles={['trainer']}>
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="bookings/index"
          options={{
            title: 'My Sessions',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="dogs/index"
          options={{
            title: 'My Dogs',
            tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
        {/* Hidden detail routes */}
        <Tabs.Screen name="bookings/[id]" options={{ href: null }} />
        <Tabs.Screen name="dogs/[dogId]" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
```

---

## TASK 2 — My Sessions Screen (Booking List)

Create: `app/(trainer)/bookings/index.tsx`

Uses `useTraining` hook. Displays:
- Two tabs: **Today** and **Upcoming**
- Each booking card shows: dog name + photo thumbnail, client name, time, session type, status badge
- Tap a card → navigate to `/(trainer)/bookings/[id]`
- Pull-to-refresh
- Empty state: "No sessions scheduled" with calendar icon

Status badges:
- `pending` → grey "Pending"
- `confirmed` → gold "Confirmed"
- `completed` → green "Completed"
- `cancelled` → red "Cancelled"

---

## TASK 3 — Session Detail Screen

Create: `app/(trainer)/bookings/[id].tsx`

This is the most important trainer screen. It must:

### 3.1 — Header
- Dog photo (from dog_media, is_primary = true)
- Dog name + client name
- Date + time + duration
- Status badge

### 3.2 — Video Call Button (if confirmed + video_room_url exists)
```typescript
import { Linking } from 'react-native';
// Show a gold "Join Video Call" button that opens video_host_url
// (host URL gives trainer control in Daily.co room)
if (booking.video_host_url) {
  <Button label="Join Video Call" onPress={() => Linking.openURL(booking.video_host_url)} />
}
```

### 3.3 — Session Notes
- Text area pre-filled with existing `notes`
- "Save Notes" button — updates `training_bookings.notes` via Supabase
- Shows last saved timestamp

### 3.4 — Mark Complete
- Only show if status is `confirmed`
- Large gold "Mark Session Complete" button
- On press: update `training_bookings.status = 'completed'`, `completed_at = now()`
- Show confirmation toast

### 3.5 — Session Media Upload
- Grid of uploaded photos/videos for this dog (filtered to label = `session-[bookingId]`)
- "Upload Photo" button using `expo-image-picker`
- On upload: compress with `expo-image-manipulator` (max 1200px, 80% quality), upload to Supabase Storage `dog-media` bucket at path `dogs/[dogId]/sessions/[bookingId]/[filename].jpg`, insert to `dog_media` table with `label = 'session-[bookingId]'`, `type = 'photo'`
- Show upload progress

---

## TASK 4 — My Dogs Screen

Create: `app/(trainer)/dogs/index.tsx`

Query: `SELECT * FROM dogs WHERE status = 'in_training'` joined with trainer's booking history to show only dogs the trainer has/had sessions with.

Each card shows:
- Dog photo (primary from dog_media)
- Dog name + colour
- Number of sessions completed
- Last session date
- Tap → `/(trainer)/dogs/[dogId]`

---

## TASK 5 — Dog Progress Screen

Create: `app/(trainer)/dogs/[dogId].tsx`

Shows the full training history for one dog across all sessions:
- Dog hero (photo + name)
- All completed sessions in reverse chronological order (each showing date, notes, media count)
- Expandable notes per session
- Media gallery for all session photos

---

## TASK 6 — Trainer Profile Screen

Create: `app/(trainer)/profile/index.tsx`

Shows:
- Trainer's name and email (from `profiles` table via `useAuth`)
- This week's session count
- Total sessions completed (lifetime)
- Sign out button (same pattern as settings screen)
- Legal links row (`SettingsLegalSection` from `components/legal/LegalLinksRow`)
- App version

---

## TASK 7 — Update Root Auth Routing

In `app/index.tsx`, the `getHomeRouteForRole` function must return `/(trainer)/bookings` for role `trainer`.

Check `lib/auth/routes.ts` — update `getHomeRouteForRole` to add:
```typescript
case 'trainer': return '/(trainer)/bookings';
```

---

## TASK 8 — Update (tabs) Layout to Exclude Trainers

In `app/(tabs)/_layout.tsx`, change the AuthGuard to:
```typescript
<AuthGuard roles={['management', 'admin', 'super_admin']}>
```

Remove `trainer` from the roles array — trainers now have their own layout.

---

## CRITICAL WARNINGS

- DO NOT give trainers access to Finance, Contacts, Documents, Litters, Breeding, or Applications screens
- DO NOT use the service role key in client-side code — all Supabase calls use the anon key + RLS
- DO verify RLS on `training_bookings` allows trainers to read rows where `trainer_id = auth.uid()`
- DO NOT create files over 300 lines — split into hooks + components + screen
- All uploads go to the existing `dog-media` bucket (already public)

---

## RLS CHECK

Before finishing, verify this policy exists on `training_bookings`:

```sql
-- Trainers can read their own bookings
CREATE POLICY "trainers_own_bookings" ON training_bookings
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR is_admin()
  );

-- Trainers can update notes + status on their own bookings
CREATE POLICY "trainers_update_own_bookings" ON training_bookings
  FOR UPDATE USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
```

If these policies don't exist, add a migration: `supabase/migrations/0029_trainer_rls.sql`

---

## Testing Checklist

- [ ] Sign in as a trainer-role user — lands on `/(trainer)/bookings`
- [ ] Admin user still lands on `/(tabs)/dashboard` — not trainer screens
- [ ] Trainer cannot navigate to `/finance`, `/litters`, `/breeding` (AuthGuard blocks)
- [ ] Session notes save and persist after app refresh
- [ ] "Mark Complete" updates status and disables button afterwards
- [ ] Photo upload appears in the session media grid immediately after upload
- [ ] Video call button only shows when `video_host_url` is set
- [ ] `npx tsc --noEmit` passes with zero errors
