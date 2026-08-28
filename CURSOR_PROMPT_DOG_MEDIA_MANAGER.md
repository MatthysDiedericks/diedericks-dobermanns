# CURSOR PROMPT — Search a dog, see everything it has, manage it in one place

On `/admin/gallery` the dog field is an **upload target**, not a search. Typing "Bruce" tells the
uploader where the next file goes — it does not show you Bruce. His ten existing items stay
invisible, so there is no way to look at what a dog already has and add to it, hide something, or
take something down.

**That is the job: one screen where selecting a dog shows everything that dog has.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified against the live database — build on these, do not re-derive

- **`dog_media`** — `id, dog_id, type ('photo'|'video'), url, thumbnail_url, caption, is_primary, sort_order, is_public, client_consent, uploaded_by, approved_by, approved_at, uploaded_at`. **262 rows across 31 dogs.**
- **`documents`** where `entity_type = 'dog'` — **107 rows across 13 dogs**, with `is_public` and `client_visible`.
- **`litter_media` has a `dog_id` column but 0 rows use it.** Do not build UI for it. Note it and move on.
- **Bruce**: 8 photos, 2 videos, all `is_public = true`, one primary. **His video uploaded 17 Aug saved correctly** — nothing is lost, it simply is not shown anywhere he can reach.

---

## 1 · Selecting a dog filters the page

Keep the existing upload box. Change what happens underneath it.

When a dog is chosen, the grid below shows **that dog's media only**, and the heading says so:
*"Bruce — 8 photos, 2 videos"*. Clear the dog and the grid returns to everything.

**One control, not two.** Do not add a second search box beside the upload selector — the same
field should say both "this is where the upload goes" and "this is what you are looking at". Two
fields that both take a dog name will be typed into inconsistently, and then Matt is looking at one
dog while uploading to another.

## 2 · Every item, with the actions on it

Each tile: the image or a **video poster with a play badge and duration**, plus type, upload date,
caption, and its state — **Public**, **Hidden**, **Primary**.

Videos currently render as nothing, which is why Bruce's two videos look like empty tiles. Use
`thumbnail_url` where present; where it is null, generate a poster frame on upload and back-fill the
existing ones with a one-off script.

Per tile:

| Action | What it does |
|---|---|
| **Hide / Show** | Toggles `is_public`. The file stays. |
| **Set as cover** | Sets `is_primary`, clears it on the others. |
| **Edit caption** | Inline. |
| **Delete** | Removes the row **and** the storage object. |

### Hide and delete must not look alike

**Hide is reversible and silent. Delete is neither.** Make them visibly different weights — hide is
a quiet toggle on the tile, delete sits behind the tile menu and asks *"Delete this photo
permanently? It will be removed from the website and cannot be undone."*

**Deleting must remove the storage object too.** A row deleted without its file leaves an orphan
that still resolves at its public URL — the photo is "deleted" and still reachable by anyone holding
the link.

### Bulk

Multi-select with a checkbox on each tile, then **Hide**, **Show**, or **Delete** on the selection.
Ten items is browsable; a dog with forty is not. Bulk delete confirms with the count.

## 3 · Fix the sort order defect

**New uploads are written with `sort_order = 0` instead of `max + 1`.** Bruce's 17 Aug video landed
at 0, colliding with his primary photo — he is currently the only dog in the database with a
collision, so this has fired once and will keep firing on every future upload.

- On upload, set `sort_order` to `coalesce(max(sort_order), -1) + 1` for that dog.
- One-off back-fill so every dog's media is `0..n-1` with no repeats, preserving the current visible order and keeping the primary first.
- Drag to reorder in the grid, persisting `sort_order`.

## 4 · Documents belong on the same screen

107 documents are attached to dogs and are managed somewhere else entirely. On the selected dog,
show a **Documents** section beneath the media: name, category, date, and its visibility.

**Do not rebuild document editing here.** List them, show `is_public` / `client_visible`, and link
through to the existing document screen. **`client_visible` is not access control** — it drives what
is listed, and the storage policy decides what can actually be fetched. Say so in a comment so
nobody later treats the tick box as a permission.

## 5 · Consent stays honest

`dog_media` carries `client_consent`, `approved_by` and `approved_at`. Where a photo came from a
client, show it: *"Client photo — consent given 4 Aug"*.

**Making a client's photo public without consent is the one mistake on this screen that reaches
someone outside the business.** If `client_consent` is false, the Show toggle asks for confirmation
first and records `approved_by`.

---

## The app

Matt uploads from his phone at the kennel — the app is where this gets used most.

- Same dog selector, same filtered grid, same per-item hide / cover / caption / delete.
- Bulk select is worth having on mobile too; long-press to enter selection mode.
- Reordering can be a simple move-up / move-down rather than drag. **Drag-to-reorder inside a scrolling grid on a phone is a fight** — the arrows are honestly better here, and this counts as a justified platform difference, not a skipped feature.

---

## Rules

- One dog field, doing both jobs.
- Hide and delete are visually distinct; delete confirms and removes the storage object.
- New media gets `max + 1`, never 0.
- Consent is confirmed before a client photo goes public.
- `client_visible` is listing, not access control — comment it.
- Do not build `litter_media` UI; it has no rows.
- No file over 300 lines. `requireAdmin()` on every admin route.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Selecting Bruce shows **exactly 10 items** — 8 photos, 2 videos — and the heading says so.
- [ ] Both of Bruce's videos render a poster and a play badge, not empty tiles.
- [ ] Hiding one drops it from the public dog page; it is still on the admin screen marked Hidden. Load the public page and confirm.
- [ ] Showing it again restores it.
- [ ] Setting a different photo as cover clears `is_primary` on the previous one — show both rows.
- [ ] Deleting a test item removes the `dog_media` row **and** the storage object. Paste the storage check proving the file is gone.
- [ ] Bulk-hiding three items updates all three in one action.
- [ ] Uploading a new file gives it `sort_order = 10` for Bruce, not 0. Paste the row.
- [ ] After the back-fill, `select dog_id, sort_order, count(*) from dog_media group by 1,2 having count(*) > 1` returns **0 rows**. Paste it.
- [ ] Dragging an item to a new position persists after refresh.
- [ ] A dog with attached documents (13 dogs have them) lists them, and the link opens the existing document screen.
- [ ] Showing a photo where `client_consent = false` asks for confirmation and writes `approved_by` + `approved_at`.
- [ ] Clearing the dog returns the grid to all media.
- [ ] App: same filtered view, same actions, and hiding from the app hides on the website. Test the round trip.
- [ ] App: move-up / move-down persists.
- [ ] For each app file, `ls` the path and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Any migration or back-fill is applied and confirmed against the live database before you report done.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: sort-order fix + back-fill, the manager screen, documents
section, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
