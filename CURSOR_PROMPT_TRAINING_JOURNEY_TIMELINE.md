# CURSOR PROMPT — Training Journey Timeline (capture + display)

The signature feature: a dog's development shown in sequence, from first session to titles.
Both a public showcase and the client's private record.

---

## 0. GROUND TRUTH — read before writing anything

Supabase project: `nlmwxodvquwbjinhhbmr`. Repos: `diedericksdobermann-web` (Next.js 15),
`diedericks-dobermanns` (Expo).

**`training_logs` ALREADY EXISTS and already carries most of this. Do not create a parallel table.**

```
training_logs: id, dog_id, trainer_id, training_type, session_date,
               duration_minutes, milestone, progress_level, notes,
               video_url, created_at
```

**Also already exists — reuse, do not rebuild:**

| Thing | Where |
|---|---|
| Upload with preview + confirm | `src/components/ui/ImageUploader.tsx` (`confirmBeforeUpload`) |
| Gallery admin pattern | `src/components/admin/GalleryManager.tsx` |
| Admin auth guard | `src/lib/admin/auth.ts` (`requireAdmin()`) |
| Client auth guard | `src/lib/portal/auth.ts` (`requireClient()`) |
| Achievements (timeline ends here) | `achievements` table — 4 rows: Hunter-King PSA PDC 2nd + PSA 1 First Leg, Cleopatra PSA PDC 3rd, Hailey PSA PDC 2nd |
| Dog tier | `dogs.programme_tier` — `puppy` \| `elite_developed` \| `protection_dog` |

**Verify every column against the live DB before querying it.** This project has repeatedly
broken on assumed schema. Check `pg_constraint` before assuming any check-constraint values.

---

## 1. SCHEMA — migration `0045_training_journey.sql`

```sql
-- Many photos/videos per training entry. training_logs.video_url holds at most
-- one and cannot express a sequence.
create table if not exists training_log_media (
  id uuid primary key default gen_random_uuid(),
  training_log_id uuid not null references training_logs(id) on delete cascade,
  media_type text not null check (media_type in ('photo','video')),
  storage_path text,
  public_url text not null,
  caption text,
  sort_order int not null default 0,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_training_log_media_log on training_log_media (training_log_id, sort_order);

-- Training notes are private by default. Nothing appears publicly unless
-- explicitly published.
alter table training_logs add column if not exists is_public boolean not null default false;

-- Chapter grouping for the timeline.
alter table training_logs add column if not exists phase text
  check (phase is null or phase in ('foundation','development','advanced','competition'));

-- Entries created by quick-capture that still need their story filled in.
alter table training_logs add column if not exists is_draft boolean not null default false;

create index if not exists idx_training_logs_dog_date on training_logs (dog_id, session_date);
```

### 1a. Gallery re-categorisation (same migration)

Public gallery filters must match the product tiers used everywhere else
(`pricing_tiers.tier_key`, `dogs.programme_tier`), instead of today's ad-hoc
`puppies / training / competition / family / kennel`.

**Current live data: 63 rows `training`, 22 rows `puppies`, 0 elsewhere. Migrate, do not drop.**

```sql
-- Videos additionally carry a discipline so the public gallery can split them.
alter table gallery_items add column if not exists discipline text
  check (discipline is null or discipline in ('protection','obedience'));

-- Widen category to the tier vocabulary, keeping the operational ones that are
-- still useful internally.
alter table gallery_items drop constraint if exists gallery_items_category_check;
alter table gallery_items add constraint gallery_items_category_check
  check (category in ('puppies','elite_pups','protection_dogs','competition','kennel','family','training'));

-- Existing 63 'training' rows are general programme photography, not a tier.
-- Leave them as 'training' (still a valid category, just not a public filter)
-- rather than guessing a tier for each one. Matt re-tags them in the admin.
```

**Do NOT bulk-reassign the 63 `training` rows to a tier** — nobody knows which tier each belongs
to, and a wrong guess puts a puppy photo under Protection Dogs on a premium site. They stay
`training` and simply do not appear under the three public tier filters until re-tagged.

**RLS on `training_log_media`:** admin/trainer full access; client SELECT only where the parent
log's dog is theirs AND `is_public` is irrelevant (clients see their own dog's full record);
anonymous SELECT only where the parent log has `is_public = true` AND the dog `is_public = true`.
Mirror the policy shape already used on `training_logs`.

---

## 2. CAPTURE — two paths, both required

### 2a. Quick capture (from the gallery uploader — the fast path)

In `GalleryManager`, add **Timeline** to the category dropdown. When selected:
- reveal a **dog selector** (dogs where `status = 'in_training'` OR `programme_tier` is not null)
- reveal a **session date** field, defaulting to today
- on confirm, do NOT insert into `gallery_items`. Instead:
  - find an existing `training_logs` row for that dog+date, or create one with
    `is_draft = true`, `training_type = 'session'`
  - insert the uploaded files into `training_log_media` against that log
- show a clear confirmation: "Added 4 photos to Bruce's timeline — 12 Mar, draft. Add the details →"
  linking to the full entry editor

**Why draft:** capture must never be blocked by paperwork. The entry exists immediately; the
story is added later.

### 2a-ii. Gallery admin — updated category + discipline

`GalleryManager` category dropdown becomes:

```
Timeline (attaches to a dog's journey)   -> special, see 2a
Puppies
Elite Pups
Elite Family Protection Dogs
Competition (shows on Achievements)
Training
Kennel
Family
```

When the uploaded file is a **video**, additionally reveal a **Discipline** selector —
Protection or Obedience — writing `gallery_items.discipline`. Photos ignore it.

Values written must be the DB values (`elite_pups`, `protection_dogs`), not the display labels.

### 2b. Full entry editor — `/admin/training/journey/[dogId]`

List that dog's entries newest-first, with a clear **Draft** badge on incomplete ones.
Create/edit an entry: session date, training type, phase, `progress_level` (1–10),
`milestone` (short label — leave blank for a routine session), notes, media (add/remove/reorder),
and a **Publish to website** toggle (`is_public`).

Publishing must be deliberate and per-entry. Nothing is public by default.

---

## 3. DISPLAY — the timeline

Component `src/components/journey/JourneyTimeline.tsx`, used by both the public dog page and the
client portal. Props: `entries`, `dogName`, `dateOfBirth`, `achievements`, `variant: 'public' | 'client'`.

**These five things are what make it feel professional rather than a photo album. Implement all five.**

1. **Age-anchored, not date-anchored.** Every entry's primary label is the dog's age at that
   session, computed from `dogs.date_of_birth` and `session_date` — "14 weeks", "7 months".
   The calendar date is secondary, small and muted. If `date_of_birth` is null, fall back to the
   date alone.

2. **Day one stays visible.** The earliest entry's first photo pins in a small fixed-position
   corner card (or a sticky sidebar on desktop) labelled "Day one — 8 weeks", so the visitor is
   always seeing where the dog started while looking at where it is now. Hide on narrow mobile
   where it would crowd the content.

3. **Milestones outrank routine sessions.** An entry with a non-empty `milestone` renders large:
   gold marker on the spine, bigger media, the milestone label as a heading, trainer notes shown.
   Routine entries render compact — small marker, thumbnail row, notes collapsed.

4. **The spine climbs.** A vertical line down the left edge whose marker x-offset (or thickness)
   is driven by `progress_level`, so the page visually ascends as the dog progresses. Subtle —
   this should read as craft, not as a chart.

5. **It ends in proof.** After the final entry, render that dog's `achievements` rows as the
   terminal node — title, score, judge, location. Journey leads to titles. If the dog has none,
   end with a quiet "In training" marker instead.

Group entries under phase headings (Foundation / Development / Advanced / Competition) where
`phase` is set. Videos play inline; reuse the existing gallery lightbox behaviour.

### Where it appears
- **Public:** `/dogs/[slug]` — only entries with `is_public = true`, and only for dogs with
  `programme_tier = 'elite_developed'`. Section heading "The Journey".
- **Client portal:** `/portal/dogs/[id]` — ALL entries for their own dog including unpublished
  ones, because it is their record.

---

## 4. PUBLIC GALLERY FILTERS — `/gallery`

Today the filter row is a flat `All | Photos | Videos`. Replace with two tiers of filtering in
`src/components/gallery/GalleryGrid.tsx`:

**Row 1 — media type:** `All` · `Photos` · `Videos`

**Row 2 — contextual, changes with row 1:**
- when **Photos** (or All): `All` · `Puppies` · `Elite Pups` · `Elite Family Protection Dogs`
  → filters on `category in ('puppies','elite_pups','protection_dogs')`
- when **Videos**: `All` · `Protection` · `Obedience`
  → filters on `discipline`

Rules:
- A filter with **zero items must not render** — an empty tab on a premium site reads as broken.
  Compute counts first and only show buttons that have content.
- Row 2 resets to `All` whenever row 1 changes.
- Keep the existing lightbox, load-more and the `showFilters` prop (used by the Achievements page,
  which must continue to render with no filter rows at all).
- Dog training videos pulled in from `dog_media` (see the existing `/gallery` page query) have no
  `discipline` — they appear under Videos → All only, never under a discipline tab, until they
  are given one. Do not guess.

---

## CRITICAL WARNINGS

- **Do not put timeline photos in `gallery_items`.** They belong to a training entry. The gallery
  is for marketing photography.
- **Do not guess a tier for the 63 existing `training` photos.** Wrong tagging puts a puppy
  photo under Protection Dogs. They stay `training` until Matt re-tags them.
- **Never render an empty filter tab.** Three tabs showing "0 dogs" is exactly the bug that was
  live on `/dogs` for weeks — count first, render only what has content.
- **Nothing is public by default.** `is_public` defaults false; publishing is a deliberate act.
- **RLS is the boundary, not the UI.** Test that one client cannot read another client's training
  media by changing the URL.
- **Do not break the existing gallery upload.** Selecting any category other than Timeline must
  behave exactly as it does now.
- **No file over 300 lines.** Extract `JourneyEntry`, `JourneySpine`, `DayOneCard`.
- **No `any`.** Regenerate `database.types.ts` after the migration **and commit it** — a
  regenerated types file left uncommitted has broken this build three times.

## EXECUTION ORDER

1. Migration (training_log_media, training_logs columns, gallery category + discipline) + RLS
   → regenerate types → **commit the types file**
2. Gallery admin: new categories, discipline selector for videos, Timeline quick capture
3. Public gallery two-row filters
4. Full journey entry editor
5. `JourneyTimeline` component
6. Wire into public dog page, then portal dog page
7. `npx tsc --noEmit` exits 0

## TESTING CHECKLIST

**Gallery filters**
- [ ] Photos row shows Puppies / Elite Pups / Elite Family Protection Dogs
- [ ] Videos row shows Protection / Obedience
- [ ] A tier or discipline with no items does NOT render a tab
- [ ] Switching Photos ↔ Videos resets row 2 to All
- [ ] Achievements page still renders with no filter rows (`showFilters={false}`)
- [ ] The 63 existing `training` photos still appear under All and are not mislabelled
- [ ] Uploading a video reveals the Discipline selector; uploading a photo does not

**Journey**
- [ ] Quick capture creates a draft entry and attaches the photos
- [ ] Second upload, same dog + date, appends to the SAME entry rather than creating a duplicate
- [ ] Selecting a non-Timeline category still writes to `gallery_items` exactly as before
- [ ] Full editor sets milestone, phase, progress, notes; draft badge clears
- [ ] Age labels are correct (spot-check against date of birth)
- [ ] Milestone entries render large, routine entries compact
- [ ] Timeline terminates in the dog's achievements
- [ ] Public page shows ONLY `is_public` entries; unpublished are invisible signed-out
- [ ] Client sees their own dog's unpublished entries
- [ ] Another client cannot reach them by URL (RLS, not UI)
- [ ] Dog with no entries: section hidden, no empty scaffolding
- [ ] `npx tsc --noEmit` exits 0 and the regenerated types file is committed
