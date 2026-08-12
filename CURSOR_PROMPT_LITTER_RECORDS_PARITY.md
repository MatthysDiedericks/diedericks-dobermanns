# CURSOR PROMPT — Litter records: birth details, weights, gallery, pedigree tabs

Litter J (Claire × Santini, 10 Jul 2026, 10 puppies) is the test case. Three of those puppies
are already reserved and their buyers go home with them on **18 September**. Here is what the
system holds for them right now:

| | DogBreederPro | This system |
|---|---|---|
| Collar colour | Pink, Red, Gold, Purple… | **empty on all 10** — it is inside the puppy's *name* |
| Birth weight | 538 g, 552 g, 552 g… | **null on all 10** |
| Weights | daily, into week 3 and beyond | stops **19 Jul** — 10 days, then nothing |
| Litter gallery | newborn photos | **0 rows in `litter_media`, system-wide** |
| To-do list | present | **0 rows in `litter_todos`, system-wide** |
| Birth order / time / type per puppy | #1–10, Natural | not stored per puppy |

The tables and, in the app, most of the screens already exist. They are not being filled.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## What already exists — read it before writing anything

**Database:** `litters` (puppy_count, male/female/deceased_count, actual_date, actual_time,
whelping_type, whelping_notes, go_home_date/weeks, birth_weight_grams, retained_male_id,
retained_female_ids, announcement_image_url, public_sections), `dogs` (collar_colour,
birth_weight_grams, litter_id, reserved_for_name, status), `weight_logs` (dog_id, weight_kg,
recorded_date, session), `litter_media`, `litter_todos`, `dog_media`, `documents`,
plus the `dog_ancestors` pedigree tables imported in July.

**App (`diedericks-dobermanns`) — already built, do not rebuild:**
`components/litters/` has LitterPuppiesTab, LitterWeightsTab, WeightGrid, PuppyGrowthChart,
GrowthBenchmarkLine, **CollarPicker**, LitterPhotosTab, LitterTodosTab, LitterHealthTab,
LitterCalendarTab, LitterContractsTab, LitterFinancialsTab, LitterNotesTab, LitterReportsTab,
LitterSharingTab, LitterReleaseSection, MilestonesStrip, PuppyCard.
Hooks: `useLitterWeights`, `useLitterMedia`, `useLitterTodos`, `useDogPedigree`.
`lib/breeding/ancestors.ts`, `components/dogs/Pedigree.tsx`, `PedigreeTree.tsx`.

**Website — this is the gap.** `/admin/litters/[id]` is a single page with `edit` and
`register-pups`. There are **no tabs at all**: no birth details, no weight grid, no gallery, no
to-do list. It has only `components/litters/WeightSparkline.tsx` and
`components/portal/PuppyWeightChart.tsx`. Everything below marked "website" is new work; the app
equivalents are the reference implementation — match their behaviour, do not invent a second one.

---

## Migration `0061_litter_records.sql`

In `diedericks-dobermanns/supabase/migrations/`.

### 1. Per-puppy birth details on `dogs`

DogBreederPro records each puppy's place in the whelping — order, time, and how it was born.
When a c-section starts halfway through a litter, which puppies came out which way is a health
record, not trivia, and it is the first thing a vet asks about a struggling neonate.

```sql
alter table public.dogs
  add column if not exists birth_order integer check (birth_order is null or birth_order > 0),
  add column if not exists birth_time time,
  add column if not exists birth_type text
    check (birth_type is null or birth_type in ('natural','assisted','c_section')),
  add column if not exists deceased_at date,
  add column if not exists deceased_cause text;

create unique index if not exists dogs_litter_birth_order_key
  on public.dogs(litter_id, birth_order) where litter_id is not null and birth_order is not null;
```

`deceased_at` / `deceased_cause`: `status = 'deceased'` exists but records only that it happened.
Neonatal mortality clustered around a particular pairing or a particular week is exactly the
signal a breeding programme needs, and it cannot be seen without the date.

### 2. Keep `litters` counts honest

`litters.puppy_count`, `male_count`, `female_count` and `deceased_count` are hand-maintained and
will drift the moment a puppy's sex is corrected or one is lost. Add a trigger on `dogs` that
recalculates all four from the actual rows whenever a puppy is inserted, updated or deleted.

Litter J currently reads `puppy_count = 10, deceased_count = 1` and happens to be right. Do not
rely on that continuing to be true by hand.

### 3. Back-fill the collar colours out of the names

All ten of Litter J's puppies are named `Puppy 1 (Pink)`, `Puppy 2 (Red)` and so on, while
`dogs.collar_colour` is null on every one. The collar is the only way to tell one three-week-old
black-and-tan puppy from another, and right now it survives only as long as nobody renames the
puppy — which happens the moment a buyer names their dog.

In the migration, for dogs where `collar_colour is null` and the name matches `\(([A-Za-z ]+)\)$`,
copy the captured word into `collar_colour`. **Leave the name alone** — renaming rows in a
migration is how you lose the ability to tell what happened. A later admin task can tidy names.

Log how many rows were updated as a `raise notice` so the run is verifiable.

### 4. RLS

`litter_media` and `litter_todos` follow `litters`. To-dos are internal — `is_trainer_or_above()`
reads, `is_admin()` writes, **clients never**. Litter media follows the existing public/consent
model in `dog_media`; a newborn photo may go on the public litter page, so it needs the same
`is_public` gate rather than blanket admin-only.

Add `weight_logs`, `litter_media` and `litter_todos` to the `trg_audit` trigger list.

---

## Website — build the litter detail tabs

Turn `/admin/litters/[id]` into a tabbed page mirroring the app:
**Overview · Puppies · Weights · Media · Documents · To-Do · Financials · Contracts**.

Keep each tab in its own file under `src/components/litters/`. The page shell orchestrates; it
does not fetch. No file over 300 lines.

### Puppies — Birth details

A table, one row per puppy, in birth order: **#, collar swatch + colour, name, sex, birth weight,
birth time, birth type, status, reserved for**.

- **Collar is a colour swatch, not a word.** The app's `CollarPicker` already defines the palette — reuse the same list on the web so the two never disagree about what "Peach" looks like.
- Inline edit. Recording a whelping means typing ten rows fast, at 3am, and a modal per puppy makes that miserable.
- **Deceased puppies hidden by default, with a toggle to show them** (DogBreederPro does this and it is right — a mother's litter of ten reading as nine every day is upsetting and confusing). When shown, style them muted with the date, never struck through.
- Add-puppy row that pre-fills the next birth order.

### Weights — the grid

The app's `WeightGrid` is the model: puppies down the side, dates across the top, grouped by week,
horizontally scrollable with the puppy column frozen.

- **Entry is a column, not a cell.** Weighing a litter means ten numbers in one sitting — offer a "Weigh litter" action that walks the puppies for a single date. `weight_logs.session` already exists for exactly this.
- Grams under 1 kg, then `1 kg 324 g` — match DogBreederPro's formatting so Matt can read both without converting.
- Flag any puppy that lost weight against the previous reading, or gained less than half the litter's median that day. **Word it as a prompt to look, not a diagnosis** — "Puppy 4 gained 40 g, litter median 118 g" is useful; "failing to thrive" is alarming and often wrong.
- Reuse `GrowthBenchmarkLine` / `PuppyGrowthChart` logic from the app for the chart. Do not write a second benchmark curve.

**Litter J's weights stop on 19 July** — ten days in, nothing since, while DogBreederPro has them
running through week three. After this ships, flag that gap on the tab: *"Last weighed 19 Jul —
23 days ago"*. Do not back-fill it from DogBreederPro automatically; ask Matt, because a guessed
weight in a health record is worse than a missing one.

### Media — litter gallery

`litter_media` has **zero rows across the entire system** while DogBreederPro holds the newborn
photos. Build the upload: multi-select, drag-to-reorder, caption, and a per-image "show on public
litter page" toggle honouring the existing consent model. Compress client-side with
`browser-image-compression` as the gallery admin already does.

Tag an image to a specific puppy (`litter_media.dog_id`) so it can also appear on that puppy's
profile and in the buyer's portal — that is the feature the three Litter J buyers will actually
use between now and 18 September.

### To-Do

Also zero rows system-wide. List with due date, title, description, completed state, and an
optional puppy. **Seed a default checklist when a litter is marked born** — dew claws, first
deworming (day 14, then fortnightly), first vaccination (6 weeks), microchipping, registration
papers, vet check, go-home packs. Seeded items are editable and deletable; a checklist nobody can
change gets ignored.

Overdue in gold on the litter row and on the admin dashboard.

### Documents

Point the existing documents component at `entity_type = 'litter'`. Do not build new storage.

---

## Pedigree tabs — both repos

`PedigreeChart` / `PedigreeTree` render ancestry. DogBreederPro also offers **Ancestor Analysis,
Progeny and Siblings**, and none of the three exist here. All three are read-only views over data
already imported.

- **Siblings** — same litter (littermates) and same sire+dam from other litters (full siblings), shown separately. Half-siblings by sire and by dam in a third group. Link each to its profile.
- **Progeny** — every dog whose `father_id` or `mother_id` is this dog, grouped by litter with dates and counts. On a stud this is the page that sells him.
- **Ancestor Analysis** — for a chosen depth (default 5 generations), list each ancestor with how many times it appears and the resulting contribution. Show `wrights_coi` where held.

**Say where COI comes from.** `dogs.wrights_coi` holds a stored value; DogBreederPro computes its
own from a deeper database. If you compute anything here, label it *"calculated from 5 generations
held in this system"* and show the DogBreederPro figure separately where one exists. Two unlabelled
COI numbers that disagree is worse than one — and the Betelges/Raconti overlap in these lines means
they will disagree.

App: add these as tabs on `app/(admin)/dogs/[id]/pedigree.tsx`, reusing `lib/breeding/ancestors.ts`.
Website: as sections on the admin dog page, and expose **Siblings** and **Progeny** on the public
dog page — buyers ask "what else has this sire produced" constantly, and answering it on the page
is worth more than answering it by WhatsApp.

---

## Go-home date

DogBreederPro shows *"18 Sep 2026 · go home at 10 weeks"*. `litters.go_home_date` and
`go_home_weeks` both exist and Litter J is correctly set to 18 Sep. Surface it on the litter
header in both repos with the weeks basis stated, and make it drive the buyer's portal countdown
rather than being retyped anywhere.

---

## Rules

- `requireAdmin()` on every website page and server action.
- Never `createAdminClient()` outside admin routes.
- No file over 300 lines. Split the litter page by tab from the start.
- Weights in kg in the database, displayed as g / kg+g. Never store pounds.
- Loading, empty and error states on every tab. Empty states say what to do next, not "No data".
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>` — PowerShell redirection writes UTF-16 and corrupts the file silently.

## Verify

- [ ] After the migration, all 10 Litter J puppies have a `collar_colour`, and their names are unchanged.
- [ ] Marking a puppy deceased updates `litters.deceased_count` automatically and it disappears from the default puppies view.
- [ ] Two puppies in one litter cannot be given the same birth order.
- [ ] "Weigh litter" records ten weights against one date in one pass, and they appear in the correct grid column.
- [ ] A puppy that lost weight is flagged, and the wording is a prompt to check, not a diagnosis.
- [ ] Uploading three photos to a litter shows them in the app gallery too — same table, no duplicate storage path scheme.
- [ ] A photo marked private does not appear on the public litter page. Verify with a signed-out browser, not by reading the flag.
- [ ] A client can see litter media only for their own puppy's litter, and no `litter_todos` at all — test with a real client JWT.
- [ ] Marking a litter born seeds the default to-do checklist once, not on every save.
- [ ] Siblings on a Litter J puppy lists the other nine and excludes itself.
- [ ] Progeny on Hunter-King lists his litters with correct counts.
- [ ] Every COI figure on screen states its basis.
- [ ] Editing a weight produces an `audit_log` row naming the user.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. Build, not just types — a client/server import mistake broke every deployment for six hours this week and `tsc` did not catch it.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double (double means UTF-16).

## Commit

Two repos, two commits.

**Website:** from `diedericksdobermann-web/`, `git add -A`, one commit, `git push origin main`.
**App:** repo root is the **parent** folder, not `diedericks-dobermanns`. Commit and push separately.

**Push both**, then run `git log origin/main -1` in each and confirm it matches `HEAD`. Commits sat
unpushed for a full morning this week and cost the day.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
