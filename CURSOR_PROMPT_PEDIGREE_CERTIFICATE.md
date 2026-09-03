# CURSOR PROMPT — Pedigree certificate: brand it, and let Matt choose the photo

The pedigree chart is the document a serious buyer studies hardest, and right now it looks like a
debug view. Two problems, and they are different in kind:

1. **It is off-brand.** `src/components/pedigree/PedigreeChart.tsx` marks the sire branch with
   `border-cyan-500/30` and the dam branch with `border-rose-400/25`. Cyan and rose appear nowhere
   else in this business. Meanwhile the quote and the invoice are a dark gold-and-cream document
   with a crest. A buyer receives both. They must look like the same kennel.
2. **Every cell is identical.** Five columns of equally dense boxes on one page cannot breathe, so
   the whole thing reads as cramped regardless of styling.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
**Next free migration number: `0143`.** `0141` is the last on disk; **`0142` is reserved** by
`CURSOR_PROMPT_PORTAL_ADDITIONAL_USERS.md`. Do not reuse it.

---

## The reference — copy this, do not invent a new palette

`src/lib/documents/buildQuotePdf.ts` is the house document style and it is already correct. Read it
first. It defines:

```ts
const GOLD:    [number, number, number] = [196, 163, 90];  // #C4A35A
const BG:      [number, number, number] = [17, 16, 8];     // #111008
const SURFACE: [number, number, number] = [28, 26, 14];    // #1C1A0E
const TEXT:    [number, number, number] = [245, 240, 232]; // #F5F0E8
const MUTED:   [number, number, number] = [168, 160, 144]; // #A8A090
```

and this header sequence, which the pedigree must reproduce exactly:

- crest from `letterheadCrestBase64()`, centred, skipped silently if unreadable
- company name, Times bold 19pt, gold, uppercase, centred
- `BORN WITH PURPOSE. BUILT WITH DISCIPLINE.` in muted 8pt
- a gold hairline rule at `setLineWidth(0.3)` across the page
- document title right-aligned in Times bold

**Do not introduce a single colour that is not in that list.** That is the whole brief for the look.

---

## 1. The design

### Orientation
**A4 landscape** for the PDF. Four generations is five columns; portrait cannot hold it without
shrinking type below legibility. The quote stays portrait — that is correct, they are different
documents.

### Sire / dam distinction — replace the coloured borders entirely
Delete `border-cyan-500/30` and `border-rose-400/25`. Instead:

- One **gold hairline running horizontally across the full chart width**, separating the sire half
  (top) from the dam half (bottom).
- Down the left edge, two vertical labels in gold 8pt letterspaced: `SIRE LINE` and `DAM LINE`.
- Every cell uses the **same** gold border; only the **opacity** changes by generation (below).

This is how printed studbooks have always done it. It reads as one design system rather than two
competing colours, and it survives being printed in greyscale — which the coloured version does not.

### Progressive density — the fix for "cramped"
Cells must carry less information the further right they sit:

| Column | Contents | Border | Name size |
|---|---|---|---|
| Subject | photo, registered name, call name, DOB, colour, registration no., microchip, COI | solid gold | largest |
| Parents (gen 1) | **photo**, registered name, titles, DOB, registration no. | gold @ 45% | 11px |
| Grandparents (gen 2) | **photo if one exists**, registered name, titles, DOB | gold @ 25% | 10px |
| Great-grandparents (gen 3) | registered name, titles | gold @ 14% | 9px |
| 4th generation | registered name only | gold @ 10% | 8px |

Photos appear at the subject, parent and grandparent columns only. Past that the cell is too narrow
for an image that reads as anything but a smudge — generations 3 and 4 stay text. A cell with no
photo does not reserve empty space for one; it lays out as text-only so the column stays tight.

### Titles are the only gold text inside a cell
`titles_health` (`ZTP 1A, HD-A CHRKF CHHUN`) is what a knowledgeable buyer actually reads. Render it
in `#C4A35A`. Names go in `#F5F0E8`, dates and registration numbers in `#A8A090`. Nothing else in a
cell is gold. One highlight per cell or the emphasis is worthless.

### Empty ancestors
Do **not** print "Unknown" in every empty box — a page of "Unknown" looks like a broken database and
undersells the dogs whose lines *are* documented. Render the cell outline at 8% gold with no text.
The grid still reads; the gaps stay quiet.

### Typography
Cinzel for the subject name and the column headers (`PARENTS`, `GRANDPARENTS`,
`GREAT-GRANDPARENTS`), letterspaced ~0.16em. Lato for cell contents. In the PDF, Times — matching
`buildQuotePdf.ts`, which uses `pdf.setFont("times", …)` throughout.

### Footer
`Compiled from registry records · Issued {date} · Diedericks Dobermanns`, muted 8pt, centred. If the
subject has a COI, add the Wright's coefficient and the generation depth it was computed over —
a COI quoted without its depth is meaningless and a serious buyer will know that.

### Print variant
`buildQuotePdf.ts` notes that the on-screen letterhead keeps a light print variant because dark
stock destroys a home inkjet. Do the same here: a `@media print` rule that inverts to cream stock
with dark text and keeps the gold rules. Test it in the browser print preview and paste a screenshot.

---

## 2. Choosing the pedigree photo — migration `0143`

Matt wants to pick, per dog, which photo appears on the pedigree. This is a **separate choice from
the card photo**, and deliberately so: a dog card wants a friendly head shot, a pedigree wants a
formal stacked or standing conformation shot. Same dog, different job, different picture.

```sql
alter table public.dogs
  add column pedigree_photo_media_id uuid references public.dog_media(id) on delete set null;

comment on column public.dogs.pedigree_photo_media_id is
  'Photo shown on the pedigree certificate. Separate from the card photo (dog_media.is_primary) on
   purpose: a card wants a head shot, a pedigree wants a conformation shot. Null falls back to the
   card photo, then the newest photo.';
```

Write the migration into **both** repos' `supabase/migrations/`, byte-identical. Both carry the full
folder for one database — they are at 139 matching files and must stay that way.

### The resolver
Extend `src/lib/dogs/profilePhoto.ts` (and its twin at
`diedericks-dobermanns/lib/dogs/profilePhoto.ts` — the file header already says keep them in
lockstep). Add alongside `pickProfilePhoto`:

```ts
/**
 * Photo for the pedigree certificate.
 * 1. The photo chosen in `dogs.pedigree_photo_media_id`.
 * 2. Otherwise whatever `pickProfilePhoto` returns (pinned cover, else newest).
 * 3. Otherwise null — render the crest monogram, never a broken image frame.
 */
export function pickPedigreePhoto<T extends ProfilePhotoInput & { id: string }>(
  media: T[] | null | undefined,
  pedigreePhotoMediaId: string | null | undefined,
): T | null
```

Do not duplicate the fallback logic — call `pickProfilePhoto` for step 2. Add unit tests to
`profilePhoto.test.ts` covering: chosen id present; chosen id pointing at a deleted row (must fall
through, not return null); no chosen id; no media at all.

### The picker UI
The photo grid on the dog profile already supports pinning a cover. Add a **second** action per
photo, clearly distinct from it. Two selections on one grid confuse people fast, so:

- Label them plainly: **"Card photo"** and **"Pedigree photo"**.
- Show both badges simultaneously when one photo holds both roles.
- Above the grid, one line of copy stating what each is for. Follow the existing pattern in
  `profileCoverHint()` and add a `pedigreePhotoHint()` beside it.
- Allow clearing the pedigree choice back to the fallback.

---

## 2b. Ancestor photos — migration `0143` continued

Ancestors are **not** our dogs. I checked the live data before writing this:

```
346 ancestor rows · 13 dogs with a pedigree · max depth 4
131 distinct ancestor names
  1 row has own_ancestor_id set
```

**One.** So resolving photos only through `own_ancestor_id` would leave 345 of 346 cells blank.
Ancestor photos have to be uploadable in their own right.

### Key it on the name, not on the row — this is the important decision

The same ancestor appears in many charts. `Russkiydukh Kaban Of Raconti` appears **11 times across
8 dogs**; `Smart Wood Hills Forster` 8 times across 6. If the photo hangs off the
`pedigree_ancestors` row, Matt uploads the same picture eleven times and they drift apart. Store it
once, keyed on the normalised name, and every chart that names that dog picks it up.

```sql
create table public.ancestor_photos (
  id uuid primary key default gen_random_uuid(),

  -- lower(btrim(registered_name)). The join key. Unique — one photo per ancestor.
  name_key text not null unique,
  -- As typed, for the admin list. Never used for matching.
  display_name text not null,

  storage_path text not null,
  url text not null,
  thumbnail_url text,

  -- These are other kennels' dogs. Record where the photo came from.
  credit text,
  source_note text,
  -- Off by default: see the warning below.
  is_public boolean not null default false,

  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The join has to be indexable or every chart does 30 sequential scans.
create index pedigree_ancestors_name_key_idx
  on public.pedigree_ancestors (lower(btrim(registered_name)));
```

RLS: `is_admin()` for insert/update/delete. Read for `authenticated` (portal clients need to see
them). Anonymous read **only** where `is_public = true`.

> **Permission warning — do not skip this.** These are photographs of other breeders' dogs, taken by
> other people. Betelges, Raconti, Kleinzonderend and the rest own them. Publishing them on the
> public website without permission is a real risk to Matt's standing with the kennels he imports
> from, which is worth far more than a prettier chart. Hence `is_public` defaults to **false**:
> ancestor photos show in the admin and the client portal, and reach the public site only when Matt
> deliberately flips them. The upload form must ask for a credit and show a one-line note saying
> the photo will not go public until it is marked public.

### Resolution order for any cell's photo

1. `own_ancestor_id` set → that dog's `pickPedigreePhoto`. Our own dogs win; they are the ones we
   have good photographs of.
2. Otherwise `ancestor_photos` matched on `lower(btrim(registered_name))`.
3. Otherwise no photo — text-only cell, no reserved gap.

Put this in one function, `resolveAncestorPhoto()`, in `src/lib/pedigree/`. Do not inline it into
the cell component; the PDF builder needs the same answer.

### Upload UI — admin only

A new admin screen, **Pedigree › Ancestor photos**, listing the 131 distinct ancestor names with a
count of how many charts each appears in, sorted by count descending so the highest-value uploads
are at the top. Per row: current photo or an empty slot, upload, credit field, public toggle.

Also allow uploading directly from a chart cell in the **admin** view — clicking an empty ancestor
photo opens the same uploader, pre-filled with that name. Matt is usually looking at a chart when he
notices a gap. Never expose this in the portal or the public view.

Reuse `ImageUploader` (`src/components/ui/ImageUploader.tsx`). It already handles the HEIC-from-iPhone
conversion that was fixed on 27 Aug — do not write a second upload path and reintroduce that bug.
Bucket: `dog-media`, path prefix `ancestors/`.

---

## 2c. Generation selector

Let the viewer choose the depth: **3, 4, or 5 generations.**

### Derive the options from the data — never hardcode

Live data today: **max depth is 4**, and 12 of the 13 dogs with a pedigree have a full 4
generations. Odessa has 3. So:

- Offer only depths the dog actually has. `maxPedigreeGeneration()` in `src/lib/pedigree/layout.ts`
  already computes this — use it. Odessa must not show a "4 generations" button that renders an
  empty column.
- Offer 5 the moment a dog has 5 generations of data. Do not cap the selector at 4 with a constant;
  build the options from the data so the chart grows when the imports do.
- Filter by `position.length <= n`. The `position` string encodes depth already
  (`S`, `SS`, `SSS`, `SSSS`), which is why `generation` and `position.length` agree.

### Defaults per surface

| Surface | Default | Why |
|---|---|---|
| Admin / website desktop | 4 | Matt is assessing bloodlines; he wants everything |
| Client portal (web) | **3** | The buyer wants to see quality, not audit a studbook |
| Mobile app | **2** | 16 cells across a phone is unreadable at any font size |
| PDF | Whatever is selected when Download is pressed | |

Remember the choice in `localStorage` per surface so it survives a reload. Do not persist it to the
database — it is a viewing preference, not data.

### The PDF must honour it
A 3-generation pedigree is a cleaner document than a 4-generation one and Matt will often want the
shorter version for a buyer. The download must use the depth currently on screen, and the filename
should say so: `Claire-pedigree-4gen.pdf`.

### Layout must not break at each depth
Row count is `2^depth`, so 3 generations is 8 rows and 5 is 32. The grid maths in
`pedigreeRowSpan()` / `positionToRowIndex()` already handles this — **do not rewrite it**. But check
that the cell minimum height still fits at depth 5, and that the sire/dam dividing rule lands exactly
on the halfway boundary at every depth. That rule sits between row `2^(depth-1)` and the next one.

---

## 2d. The client portal — a first-class surface, not an afterthought

`src/components/portal/PortalDogPedigreeSection.tsx` gets the full treatment: the new certificate
look, the ancestor photos, and the generation selector. For a buyer this chart is the proof of what
they paid for, so it must not be a cut-down version of the admin one.

What the client gets:
- The branded chart, ancestor photos included
- The generation selector, defaulting to 3
- The **PDF download** for their own dog — the same certificate Matt can produce

What the client must **not** get:
- The ancestor photo uploader, or any edit affordance. Read-only, enforced by RLS on
  `ancestor_photos` (admin-only writes), not merely by hiding the button.
- Any ancestor photo where the row is missing — no broken frames, no upload prompts.

Scope every portal query to the signed-in client. A portal dog query that fetches by `dogId` without
also constraining to the caller's own dogs is the exact shape of the bug that exposed every client's
invoices in August. Follow the pattern already used in the portal dog queries and require the user
id as an argument rather than making it optional.

---

## 3. Files

Read before writing:
- `src/components/pedigree/PedigreeChart.tsx` — the chart being replaced
- `src/components/pedigree/PedigreePrintSheet.tsx` — existing print sheet
- `src/components/pedigree/PublicDogPedigreeSection.tsx`, `InheritedPedigreeSection.tsx`,
  `AdminDogPedigreeSection.tsx`, `src/components/portal/PortalDogPedigreeSection.tsx` — **four**
  call sites. All four must get the new look; do not restyle one and leave three.
- `src/lib/pedigree/layout.ts` — `pedigreeRowSpan`, `positionToRowIndex`, `ancestorIsSireSide`.
  The grid maths is correct. **Keep it.** This is a restyle, not a rewrite.
- `src/lib/documents/buildQuotePdf.ts` — the style reference
- `src/lib/dogs/formatCoi.ts`, `src/lib/pedigree/queries.ts`

New:
- `src/lib/pedigree/resolveAncestorPhoto.ts` — the three-step resolver from 2b, used by both the
  chart and the PDF. One function, one answer.
- `src/components/pedigree/GenerationSelector.tsx` — options derived from the data, never hardcoded.
- `src/app/admin/…/ancestor-photos/` — the upload screen from 2b.
- `src/lib/documents/buildPedigreePdf.ts` — landscape A4, same header helpers as the quote. If the
  crest/header code can be factored out of `buildQuotePdf.ts` without changing the quote's output,
  do that; if it cannot be done cleanly, duplicate rather than risk the quote. **The quote PDF is in
  front of paying clients — its rendered output must not change by one pixel.**
- An admin route to download the pedigree PDF, following the handover pack route pattern in
  `src/app/admin/…`. If it reads anything from `public/`, it needs `outputFileTracingIncludes` in
  `next.config.ts` or the asset vanishes in the serverless bundle — this has bitten this project
  before.

App repo: the pedigree screens under `diedericks-dobermanns/app/` get the same treatment. Parity
between the website and the app is a standing rule on this project. `ls` each file you touch and
paste the output — **do not rely on grep, it has returned false negatives on this filesystem.**

---

## 4. Rules

- No file over 300 lines. The chart, the cell, and the PDF builder are three files, not one.
- TypeScript strict, no `any`. Regenerate `database.types.ts` after `0143`.
- No colour outside the five brand values. No cyan, no rose, no Tailwind default palette.
- No font below 8px in the PDF, none below 11px on screen.
- Migration byte-identical in both repos.

## 5. Verify — paste output, not descriptions

- [ ] Render **Claire** (`DE ZELIG CLAIRE HDB1-A2, EDOO`). She has a full **4**-generation pedigree
      — 30 ancestor rows — including `Livonja Baron Amber Amulet` with titles
      `ZTP 1A, HD-A CHRKF CHHUN CHLUX 7CABCIB`, a long string that must wrap without breaking the
      cell. Screenshot.
- [ ] Render a dog with a **partial** pedigree. Confirm empty cells are quiet outlines, not a page
      of "Unknown". Screenshot.
- [ ] Render a dog with **no** pedigree. Confirm the section is absent, not an empty grid.
- [ ] All **four** call sites show the new chart. Screenshot each. Name them.

**Generation selector**
- [ ] Claire at 3 and at 4 generations. Two screenshots. Confirm the sire/dam rule stays on the
      halfway boundary at both depths.
- [ ] **Odessa** has only 3 generations. Confirm the selector does not offer 4, and that choosing
      the maximum does not render an empty column. Screenshot.
- [ ] Reload the page. Confirm the chosen depth survived.
- [ ] Download the PDF at 3 generations and at 4. Confirm the file contents differ and the filename
      records the depth. Attach both.

**Ancestor photos**
- [ ] Upload a photo for `Russkiydukh Kaban Of Raconti`. It appears **11 times across 8 dogs** —
      confirm it now shows on more than one dog's chart from that single upload. Screenshot two
      different dogs. This is the whole reason the photo is keyed on the name.
- [ ] Confirm an ancestor with no photo renders as a text-only cell with **no reserved gap** and no
      broken image frame.
- [ ] Confirm `is_public` defaults to false, and that an ancestor photo does **not** appear on the
      public `/dogs/[slug]` page until it is flipped. Screenshot before and after.
- [ ] Upload a HEIC file from an iPhone through the ancestor uploader. Confirm it converts. If you
      wrote a second upload path instead of reusing `ImageUploader`, say so — that regression was
      fixed on 27 Aug and must not come back.
- [ ] Paste the admin ancestor list showing the appearance counts, sorted descending.

**Portal**
- [ ] Load the pedigree in the client portal **as a real client**, signed in as them — not as an
      admin, and not by a SQL test. An RLS test run as admin cannot detect an unscoped query; that
      is exactly how the August invoice exposure was missed twice. Screenshot what renders.
- [ ] Confirm the portal defaults to 3 generations and the selector works.
- [ ] Confirm the client can download their own dog's pedigree PDF.
- [ ] Confirm the client sees **no** upload control anywhere on the chart.
- [ ] As that client, attempt `insert into ancestor_photos …` directly with their JWT. Paste the
      rejection. Hiding the button is not access control.
- [ ] Confirm client A cannot load client B's dog pedigree by putting the dog id in the URL.
- [ ] Download the PDF. Confirm: landscape, crest present, gold rule, four generations on one page,
      no clipping. Attach the file.
- [ ] Open the quote PDF for an existing quote and confirm it is **unchanged**. This is the
      regression that matters — say explicitly whether you refactored shared header code.
- [ ] Browser print preview of the on-screen chart in the light variant. Screenshot.
- [ ] Set a pedigree photo different from the card photo on one dog. Confirm the dog card still uses
      the card photo and the pedigree uses the other. Two screenshots.
- [ ] Delete the `dog_media` row a pedigree photo points at. Confirm the pedigree falls back to the
      card photo rather than rendering a broken image. This is the `on delete set null` path.
- [ ] `npx tsc --noEmit` clean in both repos. `npm run preflight` passes on the website.
- [ ] App: pedigree screen on a device. Say which device.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
      **Check this before saying you are done.** The website repo was found sitting one commit ahead
      of `origin/main` on 31 Aug — committed but never pushed, so nothing was deployed.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.
- [ ] Migration `0143` applied to the live database and present in both repos.

## 6. Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
