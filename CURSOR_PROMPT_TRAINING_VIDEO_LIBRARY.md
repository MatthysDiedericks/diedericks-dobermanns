# CURSOR PROMPT — Training: Fix Booking Bug, Calendar Integration & Video Library

## Context

**Project:** Diedericks Dobermanns — React Native / Expo  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind, `expo-av` for video  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`

### Existing training system (already live):
- `training_session_types` — types of sessions (in_person, video_call, both)
- `training_availability` — slots admins open for booking
- `training_bookings` — bookings per client (status: pending/confirmed/completed/cancelled)
- `training_booking_media` — photos/videos uploaded per session
- `hooks/useTraining.ts` — `useAdminTrainingBookings`, `useClientBookings`, `useSessionTypes`, `useAvailability`
- `app/(admin)/training/index.tsx` — admin Training Dashboard (Requests / Calendar / Session Types / Availability tabs)
- `app/(admin)/training/[id]/index.tsx` — booking detail (currently broken: shows "Booking not found")
- `app/(portal)/training/index.tsx` — client booking flow (7-day slot picker, session type, dog selector)
- `app/(portal)/training/bookings.tsx` — client "My Sessions" list
- `app/(tabs)/calendar/index.tsx` — existing calendar using `useCalendarEvents` — has month/week/day/year view with dot indicators

### Known bugs to fix:
1. `app/(admin)/training/[id]/index.tsx` shows "Booking not found" because it fetches ALL bookings then does `.find(b => b.id === id)` — fix: fetch by ID directly
2. Training bookings are NOT wired into the main calendar (`useCalendarEvents`) — fix: add booking events to calendar feed

---

## What to build — 6 tasks

---

### Task 1 — Fix "Booking not found" bug

**File:** `app/(admin)/training/[id]/index.tsx`

**Current broken approach:**
```typescript
const { data: bookings } = useAdminTrainingBookings(); // fetches all
const booking = bookings.find((b) => b.id === id);    // might miss it
```

**Fix:** Add a `useBookingById(id)` hook in `hooks/useTraining.ts` that fetches the single booking directly:

```typescript
/** Single booking by ID — used for booking detail screen. */
export function useBookingById(id: string | undefined) {
  const [booking, setBooking] = useState<TrainingBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BOOKING_SELECT = '*, session_type:training_session_types(*), dog:dogs(*), ' +
    'client:users!training_bookings_client_id_fkey(id, full_name, email), ' +
    'trainer:users!training_bookings_trainer_id_fkey(id, full_name), ' +
    'media:training_booking_media(*)';

  const refresh = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('training_bookings')
        .select(BOOKING_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      setBooking(data as TrainingBooking | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load booking');
      console.error('[useBookingById]', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { booking, loading, error, refresh };
}
```

**Update `app/(admin)/training/[id]/index.tsx`** to use this hook. Also expand the detail screen beyond just documents — it currently shows almost nothing. Add:
- Client name, email
- Session type + format badge
- Scheduled date/time
- Dog name
- Status badge with action buttons: Confirm (pending→confirmed), Complete (confirmed→completed)
- Trainer notes input (admin can add notes)
- Session media grid
- Documents section (already there)

---

### Task 2 — Wire training bookings into the Calendar

**File:** `hooks/useCalendarEvents.ts` — inside `loadFallbackEvents()`, add training bookings to the Promise.all fetch:

```typescript
// Add to the existing Promise.all in loadFallbackEvents:
supabase
  .from('training_bookings')
  .select('id, scheduled_at, status, session_format, client_id, dog_id, session_type:training_session_types(name)')
  .neq('status', 'cancelled')
  .gte('scheduled_at', `${monthStart}T00:00:00`)
  .lte('scheduled_at', `${monthEnd}T23:59:59`)
```

Map booking results to `CalendarEvent`:
```typescript
// Colour coding: confirmed=gold, pending=amber, completed=green
const bookingColor = (status: string) =>
  status === 'confirmed' ? '#C4A35A' :
  status === 'completed' ? '#4CAF50' : '#F5A623';

const bookingEvents: CalendarEvent[] = (bookingRows ?? []).map((b) => {
  const stype = b.session_type as { name?: string } | null;
  return {
    id: `booking-${b.id}`,
    date: b.scheduled_at.slice(0, 10),
    type: 'training' as CalendarEvent['type'],
    colour: bookingColor(b.status),
    title: stype?.name ?? 'Training Session',
    route: '/(admin)/training/[id]',
    params: { id: b.id },
    allDay: false,
  };
});
```

Also add `'training'` to the `CalendarEventType` union in `types/phase10.ts` if not already present.

Add to `EVENT_TYPE_COLORS` in `lib/health/constants.ts`:
```typescript
training: '#C4A35A',
```

In `app/(tabs)/calendar/index.tsx`, make event cards tappable — when the event has a `route`, navigate on tap:
```typescript
<Pressable
  onPress={() => {
    if (item.route && item.params) {
      router.push({ pathname: item.route, params: item.params } as never);
    }
  }}
>
  <Card className="mb-2">...</Card>
</Pressable>
```

---

### Task 3 — Migration 0027: Training Video Library

**File:** `supabase/migrations/0027_training_videos.sql`

```sql
-- 0027 — Training video library with free/bundle access tiers

-- Video bundle products (e.g. "Foundation Bundle", "Protection Bundle")
CREATE TABLE IF NOT EXISTS video_bundles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'ZAR',
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Seed the two initial bundles
INSERT INTO video_bundles (name, description, price, sort_order) VALUES
  ('Protection Training Bundle', 'Full 5-phase protection work video series with commentary from our head trainer.', 1200.00, 1),
  ('Complete Puppy Curriculum', 'Week-by-week curriculum from 8 weeks to 12 months based on IGP/Schutzhund foundations — the Diedericks Dobermanns full puppy development system.', 1800.00, 2)
ON CONFLICT DO NOTHING;

-- Bundle purchases per client
CREATE TABLE IF NOT EXISTS video_bundle_purchases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id   uuid NOT NULL REFERENCES video_bundles(id) ON DELETE CASCADE,
  purchased_at timestamptz DEFAULT now(),
  amount_paid numeric(10,2),
  payment_reference text,
  UNIQUE(client_id, bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_client ON video_bundle_purchases(client_id);

-- Video categories
CREATE TABLE IF NOT EXISTS training_video_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  icon        text DEFAULT 'play-circle',
  colour      text DEFAULT '#C4A35A',
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

INSERT INTO training_video_categories (name, description, icon, colour, sort_order) VALUES
  ('Foundation Obedience', 'Core commands every Dobermann must master — sit, down, stand, and recall.', 'ribbon', '#C4A35A', 1),
  ('Protection Work', 'Phase-by-phase introduction to protection sport — from drive building to full pattern.', 'shield', '#E74C3C', 2),
  ('Socialisation & Environments', 'Building confidence and stability in real-world environments.', 'earth', '#27AE60', 3),
  ('Puppy Curriculum', 'The complete Diedericks Dobermanns development programme — week 8 to 12 months.', 'school', '#8E44AD', 4)
ON CONFLICT DO NOTHING;

-- Videos
CREATE TABLE IF NOT EXISTS training_videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL REFERENCES training_video_categories(id) ON DELETE CASCADE,
  bundle_id       uuid REFERENCES video_bundles(id) ON DELETE SET NULL,  -- null = free
  title           text NOT NULL,
  description     text,
  video_url       text,          -- Supabase Storage path or external URL (Vimeo/YouTube)
  thumbnail_url   text,          -- Supabase Storage path
  duration_seconds int,
  access_tier     text NOT NULL DEFAULT 'free'
    CHECK (access_tier IN ('free', 'bundle', 'admin')),
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  week_label      text,          -- e.g. "Week 8–10" for curriculum videos
  tags            text[],        -- for search/filter
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_category ON training_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_bundle    ON training_videos(bundle_id);
CREATE INDEX IF NOT EXISTS idx_videos_tier      ON training_videos(access_tier);

-- Video progress tracking per client
CREATE TABLE IF NOT EXISTS video_watch_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES training_videos(id) ON DELETE CASCADE,
  watched_seconds int NOT NULL DEFAULT 0,
  completed   boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz DEFAULT now(),
  UNIQUE(client_id, video_id)
);

-- RLS
ALTER TABLE video_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_bundle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_bundles_read" ON video_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "video_bundles_admin" ON video_bundles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "purchases_read_own" ON video_bundle_purchases FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "purchases_insert" ON video_bundle_purchases FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR is_admin());
CREATE POLICY "purchases_admin" ON video_bundle_purchases FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "video_categories_read" ON training_video_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "video_categories_admin" ON training_video_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Videos: free + bundle videos visible to all authenticated users. Admin-tier hidden from clients.
CREATE POLICY "videos_read" ON training_videos FOR SELECT TO authenticated
  USING (is_active = true AND (access_tier IN ('free', 'bundle') OR is_admin()));
CREATE POLICY "videos_admin" ON training_videos FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "watch_progress_own" ON video_watch_progress FOR ALL TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "watch_progress_admin" ON video_watch_progress FOR SELECT TO authenticated
  USING (is_admin());
```

> **Apply via Supabase MCP before writing any code.**

---

### Task 4 — Seed video placeholders

**File:** `supabase/migrations/0028_video_seed.sql`

Seed all placeholder videos. Run AFTER 0027.

```sql
-- 0028 — Video placeholders for training library

DO $$
DECLARE
  cat_obedience  uuid;
  cat_protection uuid;
  cat_social     uuid;
  cat_curriculum uuid;
  bundle_protection uuid;
  bundle_curriculum uuid;
BEGIN
  SELECT id INTO cat_obedience  FROM training_video_categories WHERE name = 'Foundation Obedience' LIMIT 1;
  SELECT id INTO cat_protection FROM training_video_categories WHERE name = 'Protection Work' LIMIT 1;
  SELECT id INTO cat_social     FROM training_video_categories WHERE name = 'Socialisation & Environments' LIMIT 1;
  SELECT id INTO cat_curriculum FROM training_video_categories WHERE name = 'Puppy Curriculum' LIMIT 1;
  SELECT id INTO bundle_protection FROM video_bundles WHERE name LIKE 'Protection%' LIMIT 1;
  SELECT id INTO bundle_curriculum FROM video_bundles WHERE name LIKE 'Complete%' LIMIT 1;

  -- FOUNDATION OBEDIENCE (Free)
  INSERT INTO training_videos (category_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_obedience, 'The Sit — Foundation', 'Teaching a reliable sit using food luring and marker training. We build duration, distance, and position before adding the formal verbal cue.', 'free', 1, ARRAY['obedience','sit','foundation','beginner']),
    (cat_obedience, 'The Down — Foundation', 'Shaping a fast, confident down from both standing and sitting positions. Critical for IGP obedience and everyday control.', 'free', 2, ARRAY['obedience','down','foundation','beginner']),
    (cat_obedience, 'The Stand — Foundation', 'Teaching the stand position — often overlooked but essential for IGP obedience routines and health examinations.', 'free', 3, ARRAY['obedience','stand','foundation','beginner']),
    (cat_obedience, 'Recall Phase 1 — Building the Come', 'The recall is the single most important command. Phase 1 establishes the conditioned response using a strong reinforcement history. No corrections — pure drive.', 'free', 4, ARRAY['obedience','recall','foundation','beginner']),
    (cat_obedience, 'Recall Phase 2 — Distance & Distraction', 'Extending recall reliability to 30+ metres with mild environmental distractions. Building the habit of an immediate, enthusiastic response.', 'free', 5, ARRAY['obedience','recall','intermediate']),
    (cat_obedience, 'Recall Phase 3 — Off-Leash Reliability', 'Off-leash recall in varied environments. We introduce the formal front position and the finish (heel) for competition preparation.', 'free', 6, ARRAY['obedience','recall','off-leash','intermediate']),
    (cat_obedience, 'Recall Phase 4 — Competition Level Recall', 'The full IGP obedience recall pattern: call from the down position, straight front, finish to heel. Precision and drive simultaneously.', 'free', 7, ARRAY['obedience','recall','competition','advanced']);

  -- PROTECTION WORK (Paid bundle)
  INSERT INTO training_videos (category_id, bundle_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_protection, bundle_protection, 'Protection Phase 1 — Drive Building & Tug Foundation', 'Before the helper ever enters the picture, the dog must have an unshakeable tug drive. We build prey drive, grip quality, and the out command through structured tug sessions.', 'bundle', 1, ARRAY['protection','drive','tug','foundation']),
    (cat_protection, bundle_protection, 'Protection Phase 2 — Introducing the Helper', 'First contact with the decoy. Controlled civil agitation, equipment introduction, and the first helper-driven grip. Creating positive associations with protection work.', 'bundle', 2, ARRAY['protection','helper','decoy','intermediate']),
    (cat_protection, bundle_protection, 'Protection Phase 3 — Bark & Hold Foundation', 'The bark exercise is the foundation of all IGP protection. Teaching the dog to guard a stationary helper with sustained, powerful barking — no grip until commanded.', 'bundle', 3, ARRAY['protection','bark','hold','intermediate']),
    (cat_protection, bundle_protection, 'Protection Phase 4 — Defence Drive Development', 'Transitioning from pure prey into civil defense drive. The helper applies controlled pressure. Building courage, hardness, and full grips under stress.', 'bundle', 4, ARRAY['protection','defence','drive','advanced']),
    (cat_protection, bundle_protection, 'Protection Phase 5 — Full Pattern & Trial Preparation', 'The complete IGP protection routine: search blind, escape bite, courage test, transport, and guard. Precision, drive, and control in competition format.', 'bundle', 5, ARRAY['protection','competition','igp','advanced']);

  -- SOCIALISATION & ENVIRONMENTS (Free)
  INSERT INTO training_videos (category_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_social, 'Socialisation — People, Children & Crowds', 'The critical window (8–16 weeks) for positive human exposure. Correct greet manners, managing excitement, and building stable temperament around all types of people.', 'free', 1, ARRAY['socialisation','people','temperament','puppy']),
    (cat_social, 'Environmental Exposure — Urban Noise & Traffic', 'Systematic desensitisation to vehicles, traffic sounds, sirens, and urban environments. The goal: complete indifference — not tolerance.', 'free', 2, ARRAY['socialisation','environment','noise','desensitisation']),
    (cat_social, 'Environmental Exposure — Surfaces, Heights & Objects', 'Building physical and mental confidence on different surfaces (grates, water, sand, gravel), at heights, and around novel objects. Lays the foundation for IGP agility.', 'free', 3, ARRAY['socialisation','environment','confidence','surfaces']),
    (cat_social, 'Dog-to-Dog Socialisation', 'Controlled exposure to other dogs — reading body language, preventing reactivity, and developing appropriate social skills without creating prey drive conflicts.', 'free', 4, ARRAY['socialisation','dogs','body-language','beginner']),
    (cat_social, 'Confidence Building — Novel Environments', 'Taking your Dobermann to new places: parks, shopping centres, farms, rivers. How to manage the outing to build confidence, not anxiety.', 'free', 5, ARRAY['socialisation','environment','confidence','outings']);

  -- PUPPY CURRICULUM — Week 8 to 52 (Paid bundle)
  -- Based on IGP/Schutzhund developmental foundations — the Diedericks Dobermanns complete programme
  INSERT INTO training_videos (category_id, bundle_id, title, description, access_tier, sort_order, week_label, tags) VALUES
    (cat_curriculum, bundle_curriculum, 'Week 8–10: Arrival & First Days', 'Setting your puppy up for success from day one. Crate introduction, name conditioning, first leash contact, and establishing the handler as the source of all good things.', 'bundle', 1, 'Week 8–10', ARRAY['curriculum','foundation','puppy','week8']),
    (cat_curriculum, bundle_curriculum, 'Week 10–12: Drive Activation & Play', 'Identifying and building your puppy''s strongest drive (prey, food, play). Tug introduction, structured play sessions, and the first conditioned marker (Yes/clicker).', 'bundle', 2, 'Week 10–12', ARRAY['curriculum','drive','tug','play','week10']),
    (cat_curriculum, bundle_curriculum, 'Week 12–14: Sit, Down, Stand — Food Luring', 'Teaching the three core positions through pure food luring. Short sessions (3 min), high rate of reinforcement, building the habit of success before formalising cues.', 'bundle', 3, 'Week 12–14', ARRAY['curriculum','obedience','sit','down','stand','week12']),
    (cat_curriculum, bundle_curriculum, 'Week 14–16: Recall Foundation & First Tracking', 'Conditioning the recall cue with maximum reinforcement. Introduction to nose work — following food tracks on short grass. Building drive to the ground.', 'bundle', 4, 'Week 14–16', ARRAY['curriculum','recall','tracking','nose-work','week14']),
    (cat_curriculum, bundle_curriculum, 'Week 16–20: Formalising Commands & Leash Manners', 'Transitioning from luring to handler body language cues. Introducing the formal heel position (not competition heel yet), basic leash pressure, and first sustained positions (10 seconds).', 'bundle', 5, 'Week 16–20', ARRAY['curriculum','heel','leash','obedience','week16']),
    (cat_curriculum, bundle_curriculum, 'Week 20–24: Building Duration & Distraction', 'Sit-stay and down-stay to 1 minute with handler at heel. Introduction to mild distractions (toys, food on ground). Recall from distance (15m). Short tracking articles.', 'bundle', 6, 'Week 20–24', ARRAY['curriculum','duration','distraction','stay','week20']),
    (cat_curriculum, bundle_curriculum, 'Week 24–28: Drive Regulation — On/Off Switch', 'Teaching the dog to transition rapidly between high drive and calm. The foundation of IGP obedience — precision requires control over arousal. Structured out on the tug.', 'bundle', 7, 'Week 24–28', ARRAY['curriculum','drive','control','arousal','week24']),
    (cat_curriculum, bundle_curriculum, 'Week 28–32: Retrieve Foundation & Jumping', 'Introducing the formal retrieve (hold, front, finish). Low jump introduction — building enthusiasm and confidence for agility obstacles. Article tracking on aged tracks.', 'bundle', 8, 'Week 28–32', ARRAY['curriculum','retrieve','jumping','tracking','week28']),
    (cat_curriculum, bundle_curriculum, 'Week 32–36: Off-Leash Obedience & Group Work', 'First sustained off-leash sessions. Group work — dog working calmly among neutral dogs. Drop on recall. Stand for exam. Building reliability under social pressure.', 'bundle', 9, 'Week 32–36', ARRAY['curriculum','off-leash','group','reliability','week32']),
    (cat_curriculum, bundle_curriculum, 'Week 36–40: Protection Foundations — Helper Introduction', 'If temperament evaluation is passed: controlled helper introduction, drive building on equipment, first civil agitation. Criteria: solid grip, full commitment, fast out.', 'bundle', 10, 'Week 36–40', ARRAY['curriculum','protection','helper','foundations','week36']),
    (cat_curriculum, bundle_curriculum, 'Week 40–44: Bark Exercise & Sustained Control', 'The bark and hold exercise in protection. Simultaneously: obedience under distraction near the helper. Dog must be fully dual-tracked — working both drives cleanly.', 'bundle', 11, 'Week 40–44', ARRAY['curriculum','bark','hold','protection','week40']),
    (cat_curriculum, bundle_curriculum, 'Week 44–48: Full Routine Integration', 'Assembling all components into the IGP/BH routine structure. Tracking, obedience, and protection worked in sequence. Building mental stamina for 2-hour trial days.', 'bundle', 12, 'Week 44–48', ARRAY['curriculum','integration','routine','trial','week44']),
    (cat_curriculum, bundle_curriculum, 'Week 48–52: BH Evaluation Preparation', 'BH/VT readiness: full heeling pattern, group, traffic test, neutrality test. Protection: courage test preparation. Final temperament and control evaluation before trial entry.', 'bundle', 13, 'Week 48–52', ARRAY['curriculum','bh','evaluation','trial','week48']);

END $$;
```

> **Apply 0027 first, then 0028.**

---

### Task 5 — Training video hooks & access control

**File:** `hooks/useTrainingVideos.ts` (CREATE)

```typescript
/**
 * useTrainingVideos — fetches video categories and videos.
 * Access control is enforced via RLS + client-side access_tier check.
 */

export interface VideoCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  colour: string;
  sort_order: number;
}

export interface TrainingVideo {
  id: string;
  category_id: string;
  bundle_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  access_tier: 'free' | 'bundle' | 'admin';
  sort_order: number;
  week_label: string | null;
  tags: string[] | null;
  // Joined
  category?: VideoCategory;
}

export interface WatchProgress {
  video_id: string;
  watched_seconds: number;
  completed: boolean;
}

/** All active video categories. */
export function useVideoCategories() {
  // fetch from training_video_categories where is_active = true, order by sort_order
}

/** Videos for a category, with access_tier included. */
export function useVideosByCategory(categoryId: string | undefined) {
  // fetch from training_videos where category_id = ? and is_active = true, order by sort_order
}

/** Bundles the client has purchased. Returns a Set of bundle_ids for O(1) lookup. */
export function useClientBundles() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [purchasedBundleIds, setPurchasedBundleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const supabase = requireSupabase();
    supabase
      .from('video_bundle_purchases')
      .select('bundle_id')
      .eq('client_id', userId)
      .then(({ data }) => {
        setPurchasedBundleIds(new Set((data ?? []).map((r) => r.bundle_id)));
        setLoading(false);
      });
  }, [userId]);

  return { purchasedBundleIds, loading };
}

/** Determines if a client can play a video. */
export function canWatchVideo(
  video: TrainingVideo,
  purchasedBundleIds: Set<string>,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (video.access_tier === 'free') return true;
  if (video.access_tier === 'bundle' && video.bundle_id) {
    return purchasedBundleIds.has(video.bundle_id);
  }
  return false;
}

/** The client's watch progress across all videos. */
export function useWatchProgress() {
  // fetch from video_watch_progress for current user
  // returns a Map<video_id, WatchProgress> for fast lookup
}

/** Save/update progress after watching. */
export async function saveWatchProgress(
  videoId: string,
  watchedSeconds: number,
  completed: boolean,
) {
  // upsert into video_watch_progress on (client_id, video_id)
}
```

---

### Task 6 — Training video screens

#### 6a — Video library home: `app/(portal)/training/videos/index.tsx`

```
┌──────────────────────────────────────────────────────┐
│ TRAINING LIBRARY                                     │
│ Videos from Diedericks Dobermanns                    │
├──────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐          │
│ │ 🎖 Foundation   │  │ 🛡 Protection    │          │
│ │ Obedience       │  │ Work             │          │
│ │ 7 videos · FREE │  │ 5 videos  BUNDLE│          │
│ └──────────────────┘  └──────────────────┘          │
│ ┌──────────────────┐  ┌──────────────────┐          │
│ │ 🌍 Socialisation│  │ 🎓 Curriculum    │          │
│ │ & Environments  │  │ Week 8–52        │          │
│ │ 5 videos · FREE │  │ 13 videos BUNDLE│          │
│ └──────────────────┘  └──────────────────┘          │
├──────────────────────────────────────────────────────┤
│ MY BUNDLES                                           │
│ ✓ Protection Training Bundle — Purchased             │
│ 🔒 Complete Puppy Curriculum — R 1,800             │
│   [Unlock →]                                         │
└──────────────────────────────────────────────────────┘
```

- 2-column grid of categories
- Each card shows category name, icon, video count, and access label (FREE / BUNDLE)
- "My Bundles" section at bottom showing purchased bundles and available locked ones
- Tap category → `app/(portal)/training/videos/[categoryId].tsx`
- Tap "Unlock" → contact page or future payment flow (for now: WhatsApp link to enquire)

#### 6b — Category video list: `app/(portal)/training/videos/[categoryId].tsx`

```
┌──────────────────────────────────────────────────────┐
│ ← FOUNDATION OBEDIENCE                               │
│ Core commands every Dobermann must master            │
├──────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐  │
│ │ [THUMBNAIL]  The Sit — Foundation     FREE ✓   │  │
│ │              4 min · ████░░  65%               │  │
│ └─────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [THUMBNAIL]  The Down — Foundation    FREE     │  │
│ │              5 min · Not started               │  │
│ └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- FlatList of videos in the category
- Each row: thumbnail placeholder (grey box with play icon if no thumbnail), title, duration, access badge (FREE / 🔒 BUNDLE), progress bar if started
- Locked videos show 🔒 overlay on thumbnail and "Bundle required" badge — still visible but not tappable for playback
- Tap unlocked video → `app/(portal)/training/videos/play/[videoId].tsx`
- Tap locked video → Alert: "This video is part of the [Bundle Name]. Contact us to unlock access."

#### 6c — Video player screen: `app/(portal)/training/videos/play/[videoId].tsx`

```
┌──────────────────────────────────────────────────────┐
│ ← THE SIT — FOUNDATION                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │           VIDEO PLAYER (expo-av)              │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│  ──────────────────────────────── 01:23 / 04:15     │
│                                                      │
│  Foundation Obedience · FREE                        │
│                                                      │
│  Teaching a reliable sit using food luring and      │
│  marker training...                                  │
│                                                      │
│  Tags: obedience · sit · foundation · beginner       │
│                                                      │
│  ──── NEXT IN SERIES ────                           │
│  The Down — Foundation →                            │
└──────────────────────────────────────────────────────┘
```

**Video player implementation using `expo-av`:**
```typescript
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

// If video_url is null (placeholder), show a styled placeholder:
// Gold border, play icon, "Coming soon — video being produced"

function VideoPlayer({ video }: { video: TrainingVideo }) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  const onPlaybackStatusUpdate = (s: AVPlaybackStatus) => {
    setStatus(s);
    if (s.isLoaded) {
      // Save progress every 10 seconds
      if ((s.positionMillis / 1000) % 10 < 0.5) {
        void saveWatchProgress(video.id, Math.round(s.positionMillis / 1000), s.didJustFinish ?? false);
      }
    }
  };

  if (!video.video_url) {
    return (
      <View className="aspect-video bg-surface border border-gold/30 rounded-xl items-center justify-center">
        <Ionicons name="play-circle" size={48} color={Colors.gold} />
        <Typography variant="caption" className="mt-2 text-gold">Video coming soon</Typography>
        <Typography variant="caption" className="text-subtle text-center mt-1">
          This video is being produced by our training team
        </Typography>
      </View>
    );
  }

  return (
    <Video
      ref={videoRef}
      source={{ uri: video.video_url }}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
      onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
    />
  );
}
```

#### 6d — Add Videos tab to client Training screen

**File:** `app/(portal)/training/index.tsx` (the booking screen)

Add a "Videos" tab at the top alongside "Book Session":

```tsx
const TABS = ['Book Session', 'My Sessions', 'Training Library'] as const;
```

Or add a "Training Library" button that navigates to `/(portal)/training/videos/index`.

#### 6e — Admin video management

**File:** `app/(admin)/training/index.tsx` — add a "Videos" tab to the admin Training Dashboard

Tab content: list of all videos with upload/edit/toggle-active controls. Admin can:
- Add a video (title, description, category, bundle, upload thumbnail, upload video or paste URL)
- Toggle `is_active`
- Edit title/description/week_label
- Reorder via `sort_order`

Simple implementation: list with Edit buttons → bottom sheet form.

---

## File summary

| Action | File |
|--------|------|
| CREATE | `supabase/migrations/0027_training_videos.sql` |
| CREATE | `supabase/migrations/0028_video_seed.sql` |
| EDIT   | `hooks/useTraining.ts` — add `useBookingById` |
| EDIT   | `hooks/useCalendarEvents.ts` — add training bookings to calendar feed |
| EDIT   | `types/phase10.ts` — add `'training'` to `CalendarEventType` |
| EDIT   | `lib/health/constants.ts` — add `training` colour |
| EDIT   | `app/(tabs)/calendar/index.tsx` — make event cards tappable with navigation |
| EDIT   | `app/(admin)/training/[id]/index.tsx` — use `useBookingById`, expand detail |
| CREATE | `hooks/useTrainingVideos.ts` |
| CREATE | `app/(portal)/training/videos/index.tsx` |
| CREATE | `app/(portal)/training/videos/[categoryId].tsx` |
| CREATE | `app/(portal)/training/videos/play/[videoId].tsx` |
| EDIT   | `app/(portal)/training/index.tsx` — add Training Library entry point |
| EDIT   | `app/(admin)/training/index.tsx` — add Videos management tab |

---

## Execution order

1. Apply `0027_training_videos.sql` via Supabase MCP
2. Apply `0028_video_seed.sql` via Supabase MCP
3. Regenerate types: `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > database.types.ts`
4. Edit `types/phase10.ts` — add 'training' to CalendarEventType
5. Edit `lib/health/constants.ts` — add training colour
6. Edit `hooks/useTraining.ts` — add `useBookingById`
7. Edit `hooks/useCalendarEvents.ts` — add training bookings
8. Edit `app/(tabs)/calendar/index.tsx` — make events tappable
9. Edit `app/(admin)/training/[id]/index.tsx` — fix booking detail
10. Create `hooks/useTrainingVideos.ts`
11. Create video screens (index → category → player)
12. Edit portal training + admin training screens

---

## Critical rules

- All placeholder videos (no `video_url`) MUST show a graceful "Coming soon" state — never a crash or blank screen
- Locked videos (access_tier = 'bundle', bundle not purchased) MUST be visible in the list with a 🔒 indicator — users need to see what they're missing to be motivated to buy
- Never auto-play video — use `useNativeControls` only
- Progress save: save every 10 seconds of playback AND on unmount — use `useEffect` cleanup
- The curriculum week labels (week_label column) must display prominently in the curriculum category — week 8–10, 10–12, etc. are the primary navigation cue for clients
- Admin can upload videos to Supabase Storage bucket `training-videos` (create this bucket — public read, service role write) OR paste an external URL (Vimeo, YouTube embed)
- `canWatchVideo()` must be called before rendering the video player — never rely solely on RLS for playback access since video URLs may be public CDN links
- All new screens under 300 lines — split into sub-components
- No TypeScript errors (`npx tsc --noEmit`)
- Run `npx tsc --noEmit` after all changes

---

## Testing checklist

**Booking fix:**
- [ ] Navigate to `/(admin)/training/[id]` for a real booking ID — shows full detail, not "Booking not found"
- [ ] Client name, session type, date/time, status visible
- [ ] "Confirm" button changes status from pending → confirmed

**Calendar:**
- [ ] Training bookings appear as gold dots on calendar on the correct dates
- [ ] Tapping a booking event on the calendar navigates to the booking detail screen
- [ ] Confirmed bookings = gold, pending = amber, completed = green

**Video library:**
- [ ] `/training/videos` shows 4 category cards
- [ ] Foundation Obedience and Socialisation show as FREE
- [ ] Protection and Curriculum show as BUNDLE (🔒 if not purchased)
- [ ] Tapping a free video plays (or shows "coming soon" if url is null)
- [ ] Tapping a locked video shows Alert with bundle name
- [ ] Progress bar shows % watched on video list card after partial play
- [ ] Completed video shows ✓ checkmark
- [ ] Admin can see all videos including admin-tier
- [ ] Admin Videos tab shows video list with edit controls
- [ ] `npx tsc --noEmit` passes
