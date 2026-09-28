# Cursor Prompt — Let Matt describe each photo and video, during and after upload

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Every field needed already exists. Check before you reach for one.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## The fields already exist. Nobody can use them.

`public.gallery_items` already holds `title`, `description`, `category`, `discipline`,
`photo_taken_at`, `is_featured` and `sort_order`. There is even a Description box on the upload
card today, at `GalleryUploadCard.tsx:138`.

Measured against the live database, 15 Sep 2026:

| | |
|---|---|
| Gallery items | **127** |
| With a title | 127 |
| **With a description** | **3** |
| With a discipline | **0** |
| Videos | **0** |

Three descriptions out of a hundred and twenty-seven. When a field is that empty, the field is not
the problem — the way it is asked for is. Four reasons, and they compound:

**1. The description is a single-line `<input>`.** You cannot see what you typed past about forty
characters, so nobody writes more than a fragment. A description of a competition run or a
training session needs a few sentences. It should be a textarea.

**2. It is labelled "(optional)".** That tells the person filling it in that it does not matter, so
it gets skipped. It *is* optional — but say what it is *for* instead: this is the caption a client
reads under the photo on the public gallery.

**3. The fields sit above the uploader, so they apply to the whole batch.** Drop eight photos from
a competition and all eight get one title and one description, or more likely none, because you
cannot describe eight different photos in one box before you have seen them. **This is the real
reason the field is empty.**

**4. There is no way to edit after upload.** `actions.ts` has `addGalleryItem`,
`toggleGalleryFeatured`, `deleteGalleryItem` and `setGalleryOrder` — and no update. Once a photo is
in, its description is whatever was typed before it existed, forever. The only fix is delete and
re-upload.

---

## Task 1 — Describe each file after choosing it, not before

Change the shape of the flow:

**Now:** fill in title + description → drop files → all files get the same text.
**Should be:** drop files → a row appears per file → fill in what each one needs → save.

After the files are selected, show one row per file:

- the thumbnail, large enough to recognise the photo
- **Title** — single line
- **Description** — a **textarea**, three rows, growing to about six
- **Date taken** — pre-filled from the file's EXIF where present, otherwise the file's last-modified
  date, otherwise blank. 67 of the 127 existing items have `photo_taken_at`, so something already
  reads it; reuse whatever that is rather than writing a second parser.
- **Category** — defaults to the batch category, changeable per row
- **Discipline** — only for video rows

Give the batch a **"apply to all"** control for title, category and date, because a competition
shoot genuinely is twenty photos of one event. But make per-row the default surface, so the person
sees each photo and has somewhere to put what is different about it.

**Save must be one action for the whole batch.** Do not make Matt save twenty times.

## Task 2 — Make everything editable afterwards

Add `updateGalleryItem(id, fields)` to `src/app/admin/(panel)/gallery/actions.ts`, covering
`title`, `description`, `category`, `discipline`, `photo_taken_at` and `is_featured`.

In the admin gallery grid, clicking an item opens an edit panel with those fields. Save in place,
no page reload. This is what makes the 124 items with no description fixable — without it, this
whole job only helps photos uploaded from today onwards.

## Task 3 — Show the description where a client will read it

On the public gallery, the description should appear under the photo — in the lightbox at minimum,
and as a caption in the grid where the layout allows. There is no point capturing it otherwise.

If a description is absent, show nothing. **Do not fall back to the filename or the title** — a
caption reading `WhatsApp_Image_2026-06-24_at_14_40_38.jpg` is worse than no caption.

## Task 4 — Dog photos and litter photos too

The same upload card writes to `dog_media` and `litter_media` when the destination is a dog or a
timeline entry. Both of those tables have a **`caption`** column and no description. 25 of 281
`dog_media` rows have a caption.

**Use `caption`. Do not add a description column to those tables.** A dog photo needs one line —
"Hunter-King, PSA trial, March 2026" — not an essay; the essay belongs on the dog's own profile.
One well-used field beats two half-used ones.

Surface `caption` in the per-file rows for those destinations, and in the edit panel.

## Task 5 — App parity

The app must be able to do the same: per-file description on upload, and edit afterwards. The
website is the reference implementation. If the app has no gallery upload at all today, say so in
the report rather than building one silently — that is a bigger job and Matt should choose it.

---

## Do not

- Do not add a migration. `gallery_items` already has every field this needs.
- Do not make description mandatory. Matt uploads in batches and sometimes a photo needs nothing
  said about it.
- Do not auto-generate descriptions from the filename, the dog's name, or anything else. A wrong
  caption on a public page is worse than a blank one.
- Do not touch `is_public` or client consent on `dog_media`. Those are access control, not detail.
- Do not change the nine gallery categories. They are pinned to the
  `gallery_items_category_check` constraint, and the comment at `GalleryUploadCard.tsx:21` says so.

---

## Report

1. Screenshot of the upload card after dropping **four** photos, showing four separate rows with
   their own description boxes.
2. Screenshot of "apply to all" filling the batch.
3. Screenshot of editing an existing item — use one of the 124 that currently has no description.
4. Screenshot of the public gallery lightbox showing a description.
5. Confirmation that a photo with no description renders with no caption at all, not a filename.
6. The same on the app, or a clear statement that the app has no gallery upload yet.
7. `npx tsc --noEmit` clean in both repos.
