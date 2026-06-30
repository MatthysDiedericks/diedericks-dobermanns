# Cursor Prompt — Phase 9: Training Booking, Video Calls & Final Polish

## IMPORTANT — READ FIRST

The database schema has been updated. The file `database.types.ts` in the project root now contains the complete, authoritative TypeScript types. **Regenerate your local Supabase types from this file** — do not generate them from scratch, use the updated `database.types.ts` as-is.

The bundle ID in `app.json` / `app.config.ts` must be `com.diedericksdobermanns.app` (one 'i' in Diedericks). Verify and fix this now before doing anything else.

---

## CONTEXT

Stack: React Native + Expo SDK 56, TypeScript strict, Expo Router (file-based), NativeWind, Zustand, Supabase.
Brand: Deep olive background `#1C1A0E`, gold `#C4A35A`, white text. Cinzel serif for headings. Premium heritage luxury feel.
Supabase project: `https://nlmwxodvquwbjinhhbmr.supabase.co`

---

## TASK 1 — Fix Bundle ID

In `app.json` or `app.config.ts`:
- iOS bundleIdentifier: `com.diedericksdobermanns.app`
- Android package: `com.diedericksdobermanns.app`

---

## TASK 2 — Training Booking System (Client-Facing)

The database already has these tables (already migrated, RLS already set):
- `training_session_types` — types of sessions (consultation, obedience, video review, etc.)
- `training_availability` — admin-defined open slots
- `training_bookings` — client bookings with video call fields
- `training_booking_media` — trainer uploads post-session media for client

### New screen: `app/(client)/training/index.tsx` — "Book a Session"

Layout:
1. Hero header: "Book a Training Session" in Cinzel gold
2. Horizontal scroll of session type cards fetched from `training_session_types` (filter `is_active = true`, order by `sort_order`). Each card shows: name, description, duration, session_format badge (📍 In Person / 📹 Video Call / both). Tapping selects the type.
3. Once a type is selected, show a calendar week-view (simple, no library needed — render 7 days horizontally). Fetch available slots from `training_availability` where `available_date >= today` and `is_blocked = false` and `session_type_id = selectedTypeId` (or null, meaning all types). Show day as gold if slots exist, grey if not.
4. Tapping a day reveals time slots for that day. Each slot shows start_time–end_time. Disabled if max_bookings already reached (count confirmed+pending bookings for that availability_id).
5. Booking form overlay/modal: client_notes textarea ("What would you like to work on?"), dog_id picker (from client's reserved/purchased dogs), session_format picker if session type supports 'both'.
6. Submit inserts into `training_bookings` with status 'pending'. Show success state: "Your request has been received. We will confirm within 24 hours."
7. Send push notification to admin on new booking request.

### New screen: `app/(client)/training/bookings.tsx` — "My Sessions"

List of the logged-in client's bookings ordered by `scheduled_at DESC`.
Each booking card shows:
- Session type name
- Date/time formatted (e.g., "Tuesday, 24 June · 10:00")
- Status badge: pending (grey), confirmed (gold), completed (green), cancelled (red)
- Dog name if linked
- Format badge (In Person / Video Call)

If status is `confirmed` and `session_format = 'video_call'` and `video_room_url` is not null:
- Show a gold "Join Video Call" button. Tapping opens `video_room_url` in the device browser using `Linking.openURL()`.
- Show countdown to session time.

If status is `completed` and booking has media in `training_booking_media`:
- Show "View Session Media" to browse trainer-uploaded photos/videos.

Allow client to cancel pending/confirmed bookings (update status to 'cancelled', set cancelled_by and cancelled_at).

### New admin screen: `app/(admin)/training/index.tsx` — "Training Dashboard"

Tabs: Requests | Calendar | Session Types | Availability

**Requests tab:**
List all bookings ordered by scheduled_at. Filter by status. Each booking shows client name, session type, date/time, dog name, format. Admin can:
- Confirm booking → set status = 'confirmed', confirmed_at = now(). If session_format = 'video_call', trigger Supabase Edge Function `create-video-room` (see Task 3).
- Cancel booking → set status = 'cancelled'.
- Assign trainer → update trainer_id.
- Mark complete → set status = 'completed', completed_at = now().

**Calendar tab:**
Monthly calendar view. Each day shows dot count of bookings. Tapping a day lists bookings for that day.

**Session Types tab:**
List and edit `training_session_types`. Admin can toggle is_active, edit name/description/duration/price/format, reorder.

**Availability tab:**
Admin sets open slots. Form: date picker, start_time, end_time, session_type (optional), max_bookings, notes. Shows existing slots in a list with delete option.

### New trainer screen: `app/(trainer)/bookings.tsx`

Trainer sees only their assigned bookings. Can update trainer_notes, mark complete, upload session media.

---

## TASK 3 — Video Call Integration (Daily.co)

Install: `npx expo install expo-web-browser`
Add to `.env.example`: `DAILY_API_KEY=get_from_daily.co`

### Supabase Edge Function: `supabase/functions/create-video-room/index.ts`

This function is called by the admin when confirming a video_call booking.

```typescript
// Called with: { bookingId: string }
// 1. Fetch the booking from training_bookings
// 2. POST to https://api.daily.co/v1/rooms with:
//    - name: `dd-session-${bookingId.slice(0,8)}`
//    - privacy: 'private'
//    - properties.exp: Unix timestamp of scheduled_at + duration_minutes + 30min buffer
//    - properties.max_participants: 2
//    - properties.enable_screenshare: false
//    - properties.start_video_off: false
// 3. POST to https://api.daily.co/v1/meeting-tokens with:
//    - room_name: above room name
//    - properties.is_owner: true  → this is the host token for trainer
//    - properties.exp: same expiry
// 4. Update training_bookings SET:
//    - video_room_name = room.name
//    - video_room_url = room.url  (client join link)
//    - video_host_url = meeting_token.token  (trainer uses this)
//    - video_room_expires_at = expiry timestamp
//    - status = 'confirmed'
//    - confirmed_at = NOW()
// 5. Return { clientUrl, hostUrl }
```

Use `Deno.env.get('DAILY_API_KEY')` and `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.
Deploy with: `supabase functions deploy create-video-room`

**Note for now:** Daily.co has a free tier (2,000 participant-minutes/month). For production, set up billing. The free tier is enough for testing.

**Alternative if Daily.co is not set up yet:** When session_format = 'video_call', set `video_room_url` to a Google Meet link that the admin pastes manually. The Edge Function approach above is the proper architecture — build the UI to support it but allow manual URL entry as a fallback.

---

## TASK 4 — UI Overhaul: Heritage Luxury Theme

Reference: Premium European dog breeder aesthetic (gold navigation bar, Cinzel serif headings, dark parchment backgrounds, large photography, restrained gold accents).

### Global changes:

**Navigation bar** (`app/_layout.tsx` and tab navigators):
- Background: `#111008` (near black)
- Active tab icon/text: `#C4A35A` (gold)
- Inactive: `#5C5746` (muted gold-grey)
- Header title: Cinzel font, gold, letter-spacing 2

**Typography** (update `constants/fonts.ts` or wherever fonts are defined):
- Headings: `Cinzel_400Regular` and `Cinzel_700Bold` from `@expo-google-fonts/cinzel`
- Body: `Lato_400Regular` and `Lato_700Bold` from `@expo-google-fonts/lato`
- Install: `npx expo install @expo-google-fonts/cinzel @expo-google-fonts/lato expo-font`

**Colour tokens** (add to `constants/colors.ts`):
```typescript
export const colors = {
  background: '#111008',
  surface: '#1C1A0E',
  surfaceElevated: '#252218',
  gold: '#C4A35A',
  goldLight: '#D4B472',
  goldDim: '#8A7240',
  text: '#F5F0E8',
  textMuted: '#9E9880',
  textSubtle: '#5C5746',
  border: '#2E2B1E',
  borderGold: '#C4A35A33',
  error: '#C0392B',
  success: '#27AE60',
}
```

**Reusable components to create/update:**

`components/ui/GoldButton.tsx` — Primary CTA button. Gold background, dark text, Cinzel font, 48px height, subtle shadow.

`components/ui/GoldOutlineButton.tsx` — Secondary button. Gold border, gold text, transparent bg.

`components/ui/SectionHeader.tsx` — Section title component. Cinzel Bold, gold, letter-spacing 3, uppercase, small gold rule underneath.

`components/ui/DogCard.tsx` — Card for dog listings. Full-bleed image top, gradient overlay bottom, dog name in Cinzel white, status badge gold. Shadow. Pressable with scale animation.

`components/ui/BookingCard.tsx` — Card for training bookings. Dark surface, gold status badge, clean typography.

`components/ui/StatusBadge.tsx` — Pill badge with status-driven colours.

**Home screen public hero:**
- Full-screen background image (the uploaded Dobermann photo or placeholder)
- Overlay gradient: `rgba(17,16,8,0.55)` top, `rgba(17,16,8,0.9)` bottom
- Logo/monogram centred
- Tagline: "Precision bred. Professionally trained. Lifetime proven." in Cinzel italic gold
- Scroll-down indicator

---

## TASK 5 — Phone-First Media Uploads

Install if not already present:
```bash
npx expo install expo-image-picker expo-image-manipulator expo-document-picker expo-av
```

### Component: `components/MediaUploader.tsx`

Props:
```typescript
interface MediaUploaderProps {
  bucket: string           // 'dog-media' | 'gallery' | 'session-media' | 'documents'
  path: string             // storage path prefix, e.g., `dogs/${dogId}/`
  accept: ('photo' | 'video' | 'document')[]
  maxFiles?: number        // default 10
  onUploadComplete: (urls: string[]) => void
  existingUrls?: string[]  // show existing media
  showCamera?: boolean     // default true — show camera option
}
```

Behaviour:
- Shows existing media in a horizontal scroll (images) or list (docs)
- "Add Media" button opens ActionSheet: "Take Photo", "Choose from Library", "Record Video" (if video in accept), "Choose Document" (if document in accept)
- Before upload: compress images to max 1200px wide, quality 0.82 using expo-image-manipulator
- Upload to Supabase Storage at `${bucket}/${path}${Date.now()}_${filename}`
- Show upload progress per file
- On complete, call onUploadComplete with public URLs
- Allow delete of existing (with confirmation)

Use this component in:
- Dog profile edit (admin): `app/(admin)/dogs/[id]/edit.tsx`
- Gallery management: `app/(admin)/gallery/index.tsx`
- Training booking media: `app/(trainer)/bookings/[id]/media.tsx`
- Application documents upload: `app/(client)/apply/step4.tsx`

---

## TASK 6 — Client Groups & Broadcast Messaging UI

### Client-facing: `app/(client)/groups/index.tsx`

Show groups the client belongs to (from `client_group_members` JOIN `client_groups` WHERE `client_id = auth.uid()`).
Each group card: name, litter name or type, member count, last message date.
No messaging inside the app — groups are for admin broadcast targeting only. Show this clearly: "Your breeder will send updates to this group."

### Admin: `app/(admin)/messaging/index.tsx`

Tabs: Compose | History

**Compose tab:**
- "Send to" picker: All Clients, or select a specific group from `client_groups`
- Title field
- Body textarea
- Optional image (MediaUploader)
- Channels checkboxes: Push Notification ✓, Email, WhatsApp (greyed if not configured)
- Schedule toggle: Send Now / Schedule for later (datetime picker)
- Preview button → shows message preview card
- Send button → inserts into `broadcast_messages`, triggers Supabase Edge Function `send-broadcast`

**History tab:**
List of past broadcasts ordered by created_at DESC. Each shows title, status badge, recipient_count, channels used, sent_at.

### Edge Function: `supabase/functions/send-broadcast/index.ts`

Called with broadcast_messages.id. Fetches the record, iterates group members, sends push notifications via Expo Push API. Updates status to 'sent', sets sent_at, sets recipient_count. Handles email via Resend if channel includes 'email'.

---

## TASK 7 — Social Media & Contact Links

### Public screen: `app/(public)/contact.tsx`

Update to include social links with brand icons (use react-native-vector-icons or inline SVGs):
- Instagram: `https://www.instagram.com/diedericksdobermanns` → opens in browser
- Facebook: `https://www.facebook.com/diedericksdobermanns` → opens in browser
- WhatsApp: `https://wa.me/27XXXXXXXXX` → opens WhatsApp (admin to fill number in app_settings)
- Telegram: Opens Telegram channel (if applicable)
- YouTube: Opens channel (if applicable)

Fetch social links from `app_settings` table using keys: `social_instagram`, `social_facebook`, `social_whatsapp`, `social_telegram`, `social_youtube`. Admin can update these in the admin panel settings screen.

### Admin: `app/(admin)/settings/index.tsx`

Add social links section. Load and save app_settings rows by key. Also include: enquiries email address, WhatsApp business number, business address for contact page.

---

## TASK 8 — Terms & Conditions Screen

### Public screen: `app/(public)/terms.tsx`

Read content from `content/terms-and-conditions.md` (already exists in project root).
Display as scrollable formatted text with:
- Cinzel gold headings per section
- Readable body text at 15px
- Gold dividers between sections
- "Last updated: 2026" footer

### Wire into application form (Step 5 / final step):

In `app/(client)/apply/step5.tsx` (or wherever terms acceptance is):
- Display scrollable T&C summary (key points only, with "View full T&Cs" link to the terms screen)
- Mandatory checkbox: "I have read and agree to the Diedericks Dobermanns Terms and Conditions of Sale"
- The checkbox must be ticked to enable the Submit button
- On submit, set `agreed_to_terms = true` in the applications insert

---

## TASK 9 — About Us Screen

### Public screen: `app/(public)/about.tsx`

Read content from `content/about-us.md` (already exists in project root).

Layout:
1. Full-bleed hero image (Dobermann photo, updatable from Supabase Storage)
2. Gradient overlay, "Born With Purpose. Built With Discipline." in Cinzel gold
3. Scrollable sections: Who We Are, Breeding Philosophy, What We Offer (3 product tier cards in gold), Our Training, Our Promise
4. Product tier cards: each a dark surface card with gold top border, tier name in Cinzel, description in body text
5. CTA at bottom: "Apply for a Dog" → navigates to application form

---

## TASK 10 — Missing Features (Gap Analysis from Competitor Research)

The following features were identified as missing from competitor apps (Good Dog, BreederCloudPro, Breedera) and should be added:

### 10a. Puppy weight & milestone tracker (client-facing)
In `app/(client)/dogs/[id]/milestones.tsx`:
- Trainer/admin can log weight entries and milestones for a puppy in the client portal
- Client sees a simple line chart of weight over time (use `react-native-chart-kit` or `victory-native` — install whichever is lighter)
- Milestone list below: date, milestone name, trainer notes
- These are read from `training_logs` for dogs linked to the client's reservation

### 10b. E-contract signing (in-app)
In `app/(client)/contracts/[id].tsx`:
- Display contract document (PDF URL from `contracts.document_url`, open with `expo-web-browser`)
- Beneath: "I confirm I have read and agree to this contract" checkbox
- "Sign" button → updates `contracts SET signed_by_client = true, signed_at = NOW()`
- Send confirmation email via Resend Edge Function

### 10c. Vaccination schedule (client-facing)
In `app/(client)/dogs/[id]/health.tsx`:
- Fetch `vaccinations` for the dog linked to client's reservation
- Timeline view: past vaccines (green tick), upcoming due dates (gold bell icon with date)
- "Request reminder" toggle → stores preference in app_settings or a future reminders table

### 10d. Public achievements showcase
In `app/(public)/achievements.tsx`:
- Fetch dogs WHERE is_public = true, join achievements
- Group by dog, show dog photo, name, and achievement cards
- Each card: title (e.g., "PSA 1 — Score 98"), trial_date, location, judge
- Sort by trial_date DESC
- This builds credibility on the public-facing site

### 10e. Waiting list self-registration (client portal)
In `app/(client)/litters/[id]/waitlist.tsx`:
- If client is not already on waiting list for a litter, show "Join Waiting List" button
- Captures preference_notes in a simple form
- Inserts into `waiting_list`
- Admin can see and manage all waiting list entries in admin panel

---

## FILE STRUCTURE — NEW FILES TO CREATE

```
app/
  (client)/
    training/
      index.tsx          ← Book a session
      bookings.tsx       ← My sessions + video call join
    groups/
      index.tsx          ← Client's litter groups
    dogs/
      [id]/
        milestones.tsx   ← Puppy weight & milestones
        health.tsx       ← Vaccination schedule
    contracts/
      [id].tsx           ← View & sign contract
    litters/
      [id]/
        waitlist.tsx     ← Join waiting list
  (admin)/
    training/
      index.tsx          ← Training dashboard (all tabs)
    messaging/
      index.tsx          ← Broadcast composer + history
    settings/
      index.tsx          ← Social links + app settings
  (trainer)/
    bookings.tsx         ← Trainer's assigned sessions
    bookings/
      [id]/
        media.tsx        ← Upload session media
  (public)/
    about.tsx            ← About Us
    terms.tsx            ← Terms & Conditions
    achievements.tsx     ← Public achievements

components/
  ui/
    GoldButton.tsx
    GoldOutlineButton.tsx
    SectionHeader.tsx
    DogCard.tsx
    BookingCard.tsx
    StatusBadge.tsx
  MediaUploader.tsx

supabase/
  functions/
    create-video-room/
      index.ts
    send-broadcast/
      index.ts

constants/
  colors.ts              ← Update with full token set
```

---

## ENV VARIABLES TO ADD

Add to `.env` and `.env.example`:
```
DAILY_API_KEY=get_from_daily.co
DAILY_DOMAIN=your-daily-domain.daily.co
```

---

## DO NOT REBUILD

Do not touch or rebuild:
- Authentication flow (already working)
- Supabase client setup
- Existing RLS policies
- The `database.types.ts` file (already regenerated — use as-is)
- The `content/about-us.md` and `content/terms-and-conditions.md` files (read them, don't recreate)

---

## ORDER OF EXECUTION

1. Fix bundle ID
2. Install fonts (Cinzel, Lato) and apply global theme (Task 4)
3. Build MediaUploader component (Task 5) — many other screens depend on it
4. Training booking UI — client screens (Task 2)
5. Edge Function for video rooms (Task 3)
6. Admin training dashboard (Task 2 admin)
7. Broadcast messaging (Task 6)
8. About Us + Terms screens (Tasks 8 & 9)
9. Missing features — implement in order listed (Task 10)
10. Social links (Task 7)

After each step, verify TypeScript compiles cleanly with `npx tsc --noEmit`.
Run `npx expo start --tunnel` when ready for Matt to preview on his phone.
