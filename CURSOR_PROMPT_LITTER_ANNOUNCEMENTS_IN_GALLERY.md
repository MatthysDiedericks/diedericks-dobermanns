# Cursor Prompt — Litter announcements upload in the gallery, permanently

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both when done. Paste the real output.

**`CURSOR_PROMPT_HEALTH_CHECK_18_SEP.md` must be finished and pushed before you start this one.**
`src/components/admin/galleryOptions.ts` — the file this whole prompt builds on — is currently
untracked. Building on an uncommitted file means one bad `git clean` erases both pieces of work.

---

## The gap

A litter announcement poster can be displayed but cannot be uploaded. `litters.announcement_image_url`
is a bare `text` column with no admin field anywhere — it appears in **zero** files under
`src/app/admin`. The three posters now live were put into Supabase storage by hand.

Half the plumbing already exists and was built today:

```ts
// src/components/admin/galleryOptions.ts
export type Destination = "gallery" | "dog" | "timeline";

{ value: "litter_announcements", label: "Litter Announcement (poster)" },
{ value: "planned_litters",      label: "Planned Litters" },
```

Both categories are already in the live `gallery_items_category_check` constraint. **Neither has ever
been used — zero rows.** They are a door with no handle: you can pick "Litter Announcement" as a
category, but `gallery_items` has no `litter_id`, so the poster cannot attach to a litter and the
litter cannot find its poster.

Verified live, 18 Sep 2026:

| | |
|---|---|
| `gallery_items` rows | 127 — `training` 61, `competition` 27, `puppies` 24, `kennel` 12, `elite_pups` 3 |
| `gallery_items.litter_id` | **does not exist** |
| `gallery_items.is_public` | **does not exist — everything in this table is public** |
| `litter_media` rows | **0.** Table exists, never used. |
| `litters.announcement_image_url` | 3 values, all hand-placed in the `dog-media` bucket |
| storage buckets | `gallery`, `litter-media`, `dog-media` all exist |

## The decision, and why

**Announcements go in `gallery_items` with a `litter_id`. Not in `litter_media`.**

`litter_media` is empty and unused; routing posters there would open a third media home alongside
`gallery_items` (127 rows) and `dog_media`, and the gallery upload screen already routes to two
destinations. Adding a third to an existing switch is one change. Standing up an unused table is a
new surface nobody maintains.

**What makes this permanent** — three constraints, so the gap cannot reopen by anyone forgetting a step:

1. **One poster per litter, enforced by a partial unique index.** Not by the UI, not by convention.
2. **`litters.announcement_image_url` is dropped.** One place to look. A column that can disagree
   with the gallery will eventually disagree with the gallery.
3. **An announcement's public visibility is derived from `litters.is_public` in SQL.** Not a
   checkbox. `gallery_items` has no `is_public` column at all, so anything in that table is live the
   moment it saves — and on 18 Sep I had to pull a poster for a litter that should never have been
   public. That must be structurally impossible, not remembered.

---

## Task

### 1. Migration — link, constrain, migrate, drop

New migration in **both** repos. End it with `notify pgrst, 'reload schema';` — omitting that has cost
this project two days already.

```sql
alter table public.gallery_items
  add column if not exists litter_id uuid
    references public.litters(id) on delete set null;

create index if not exists gallery_items_litter on public.gallery_items (litter_id);

-- One announcement per litter. The database decides, not the form.
create unique index if not exists gallery_items_one_announcement_per_litter
  on public.gallery_items (litter_id)
  where category = 'litter_announcements' and litter_id is not null;

-- A litter-linked category must name its litter.
alter table public.gallery_items
  add constraint gallery_items_litter_required
  check (category not in ('litter_announcements','planned_litters') or litter_id is not null);
```

**Then migrate the three existing posters** — `announcement_image_url` into a `gallery_items` row per
litter, `category = 'litter_announcements'`, `litter_id` set, `title` from the litter name. Do it in
the same migration, from the table, not from a hardcoded list. **Verify three rows land before the
drop**, then:

```sql
alter table public.litters drop column announcement_image_url;
```

If the copy produces anything other than three rows, **stop and report** — do not drop the column.

### 2. Public visibility comes from the litter, in SQL

Create a view the public site reads instead of querying `gallery_items` directly:

```sql
create or replace view public.v_public_gallery
with (security_invoker = true) as
select g.*
from public.gallery_items g
left join public.litters l on l.id = g.litter_id
where g.litter_id is null or l.is_public = true;
```

`security_invoker = true` — the value is `true`, not `on`. The daily health check verifies this and a
wrong value there has already produced a false alarm on all six existing views.

Point `src/app/(site)/gallery/page.tsx` and `src/app/(site)/achievements/page.tsx` at the view. Admin
keeps reading the table directly so Matt can see unpublished posters.

**Announcement posters do not appear in the public gallery grid.** A poster is an advert; the gallery
is photographs, and mixing them cheapens it. Exclude `litter_announcements` from `GalleryGrid` —
they render on the litter card and the litter page only. `planned_litters` **does** stay in the grid.

### 3. The fourth destination

`galleryOptions.ts`:

```ts
export type Destination = "gallery" | "dog" | "litter" | "timeline";

{ value: "litter", label: "A litter (photos or the announcement poster)" },
```

In `GalleryUploadCard.tsx`, when destination is `litter`:

- show a **litter picker** — all litters, newest first, showing status, so a `planned` litter can get
  its poster before it is public
- category defaults to `litter_announcements`, switchable to `planned_litters`
- bucket `gallery`, path `litters/{litterId}/`
- **if that litter already has an announcement, say so and offer Replace** — do not let the unique
  index throw a raw Postgres error at Matt. Replace overwrites the existing row rather than inserting.
- keep the per-file description and `photo_taken_at` fields built today — an announcement has a
  caption like any other item

When the destination is `litter` and the litter is not public, show one line under the picker:
**"This litter is not on the website yet — the poster will stay private until you publish it."**
That sentence is the whole safety story, said out loud, at the moment it matters.

### 4. Read the poster from one place

Add `src/lib/litters/announcement.ts`:

```ts
export async function fetchLitterAnnouncement(litterId: string): Promise<GalleryItem | null>
```

One query, `category = 'litter_announcements'`, that litter. Every consumer uses it — no component
builds its own query. Update the four files that referenced `announcement_image_url`:

```
src/app/(site)/litters/[id]/page.tsx
src/components/ui/LitterCard.tsx
src/components/portal/ExpectedLitterCard.tsx
src/lib/portal/expectedLitters.ts
```

### 5. App repo parity

`diedericks-dobermanns` — `app/(admin)/gallery.tsx`, `components/admin/GalleryItemEditSheet.tsx`,
`lib/admin/mutations.ts`. Same four destinations, same litter picker, same replace behaviour, same
private-litter warning. The migration goes in `diedericks-dobermanns/supabase/migrations/` too,
byte-identical.

### 6. Tests

- Two announcements for one litter → the second is rejected
- `litter_announcements` with no `litter_id` → rejected
- `v_public_gallery` hides a poster whose litter has `is_public = false`, shows it when true
- The three migrated posters resolve through `fetchLitterAnnouncement`
- A gallery item with no litter is unaffected by any of it

---

## Do not

- Do not use `litter_media` for this. It is empty; leave it empty or delete it in a later pass.
- Do not add an `is_public` column to `gallery_items`. Visibility comes from the litter — a second
  switch is a second thing to forget.
- Do not drop `announcement_image_url` until the three rows are verified in `gallery_items`.
- Do not let the unique index surface as a raw database error in the UI.
- Do not put announcement posters in the public gallery grid.
- Do not create test litters, dogs or gallery items in production. The `z` test litter
  (Boesman × Cyrus) is still there from the last time this rule was broken.
- Do not write `security_invoker = on`. It is `true`.

---

## Report

1. The migration, with the constraint and both indexes read back from the live database.
2. Row counts before and after: `gallery_items` 127 → 130, `litters.announcement_image_url` gone,
   and the three posters named with their litters.
3. A screenshot or description of the upload card with destination **A litter** selected, showing the
   litter picker and the not-public warning.
4. What happens when you upload a second poster for a litter that already has one.
5. Proof that `v_public_gallery` hides the Cleopatra × Dharka poster (that litter is
   `is_public = false` as of 18 Sep) and shows the Odessa × Santini one.
6. `npx tsc --noEmit` clean in both repos.
