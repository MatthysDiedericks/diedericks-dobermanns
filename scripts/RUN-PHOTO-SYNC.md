# Photo Sync — run these three commands

Audit date: 2026-07-31. Source: `C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's`
(32 folders, 439 media files, 129 MB).

I cannot upload from my side — my sandbox has no internet access to Supabase.
These run from your machine. Every script skips anything already uploaded, so
re-running is safe and cannot create duplicates.

```powershell
cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\scripts"

node upload-gallery-photos.mjs      # public gallery — ~49 new photos
node upload-all-breeding-dogs.mjs   # dog profiles   — ~19 new photos
node upload-dog-videos.mjs          # dog videos     — verifies 3 folders
```

If `SUPABASE_SERVICE_ROLE_KEY` is missing it reads it from
`diedericksdobermann-web\.env.local` automatically.

---

## What each one adds

### 1. Gallery — the Competition and Kennel tabs are currently EMPTY

`gallery_items` today holds only `training` (58) and `puppies` (23). Nothing else.
That is why your achievement photos have never appeared on the site.

| Folder | Files | Goes to | Shown as |
|---|---|---|---|
| Achivements | 10 | `competition` | Achievements |
| Compititions | 15 | `competition` | Competition |
| Pack | 11 | `kennel` | The Pack |
| Team | 1 | `kennel` | Our Team |
| Dog School | 12 | `training` | Dog School |
| Puppies | 21 | `puppies` | already uploaded |
| Training | 55 | `training` | already uploaded |

**~49 new photos**, and the Competition and Kennel filter tabs appear on the
website for the first time. No website code change is needed — the gallery
suppresses tabs with zero items, so they light up as soon as content exists.

### 2. Dog profiles — 19 photos missing

| Dog | On disk | In database | Missing |
|---|---|---|---|
| Bruce | 8 | 4 | 4 |
| Hannah | 10 | 7 | 3 |
| Cendra | 5 | 3 | 2 |
| Jazzmine | 4 | 2 | 2 |
| Claire | 8 | 7 | 1 |
| Cleopatra | 31 | 30 | 1 |
| Ade (root folder) | 3 | — | 3 |
| Santini Videos (stills) | 3 | — | 3 |

Every other dog folder already matches the database exactly.

### 3. Videos

`Hailey Video's` and `Kim Videos` are already in. `Santini Videos` holds one
video plus three stills — the video is in, the stills are covered by script 2.

---

## Two folder problems I found

**Ade has two folders.** `Sold\Ade\` (10 photos, June) and a second `Ade\` at the
root (3 photos + 1 video, dated 30 July). Only the Sold one was ever in the
upload manifest, so July's photos were invisible to every script. I've added the
root folder as a second entry rather than moving your files. **Consider merging
these two folders** — one dog with two folders will keep causing this.

**"Santini Videos" contains photos.** Three stills sit in a folder the video
script ignores by design. Now picked up as Santini profile photos.

---

## Left alone deliberately

- **`Logo\` (5 files)** — brand assets, not gallery content.
- **`Litter Anouncements\` (1)** — handled by `upload-litter-announcement.mjs`.
- **`Sold\` (117 photos, 13 dogs)** — already uploaded, and they go to each dog's
  own profile, not the public gallery, per your instruction.
- **8 pedigree PDFs** inside Cendra / Claire / Cleopatra — these are documents,
  not photos. All 14 pedigree documents are already in the `documents` table.
- **`WhatsApp Video 2026-07-30 at 21.37.04.mp4`** sitting loose at the root of
  Dobermann Photo's — it belongs to no folder, so nothing can place it. Move it
  into the right dog's folder and re-run script 3.

---

## After running

1. Open the website Gallery — confirm **Competition** and **Kennel** tabs now appear.
2. Check a few dog profiles (Bruce, Hannah, Jazzmine) for the new photos.
3. Re-run any script freely if a batch fails partway; it resumes cleanly.

## Google Drive

There is no Google Drive connector available in the Claude connector directory —
I searched twice. Dropbox and Box both have connectors; Drive does not. Your
photos are already in OneDrive, which is backed up, so a third copy adds cost
without adding safety. If you specifically want them in Drive, the practical
route is Google Drive Desktop syncing the folder, which needs no code.
