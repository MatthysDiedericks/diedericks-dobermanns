# CURSOR PROMPT — Training videos: buyer access, website parity, and a product Matt can sell later

The training library is the one part of this platform that becomes a **product**. Build it so that
switching a video from "included with a puppy" to "paid extra" is a toggle, not a rewrite.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — read this before you plan anything

**The app already has the whole library. The website has none of it.** That is the main gap.

| | App (`diedericks-dobermanns`) | Website (`diedericksdobermann-web`) |
|---|---|---|
| Portal video list | `app/(portal)/training/videos/index.tsx` | **missing** |
| Category screen | `app/(portal)/training/videos/[categoryId].tsx` | **missing** |
| Player | `app/(portal)/training/videos/play/[videoId].tsx` | **missing** |
| Admin add form | `components/Training/TrainingVideoAddForm.tsx` | **missing** |
| Player component | `components/Training/TrainingVideoPlayer.tsx` | **missing** |
| Tab | `components/Training/TrainingVideosTab.tsx` | **missing** |
| Hook | `hooks/useTrainingVideos.ts` | **missing** |

The website references `training_videos` in `src/types/database.types.ts` and **nowhere else**.

Database, all live today:

| Table | Rows | Note |
|---|---|---|
| `training_video_categories` | **4** | Foundation Obedience (7), Protection Work (5), Puppy Curriculum (13), Socialisation & Environments (5) |
| `training_videos` | **30** | **every one has an empty `video_url`** — they are titles waiting for footage |
| `video_bundles` | 2 | |
| `video_bundle_purchases` | 0 | the paid path exists and has never been used |
| `video_watch_progress` | — | exists |
| `training_guides` | 0 | empty |

`training_videos` columns: `category_id, bundle_id, title, description, video_url, thumbnail_url,
duration_seconds, access_tier, sort_order, is_active, week_label, tags`.

**`access_tier` currently holds only `free` (12) and `bundle` (18).** There is no value that means
*"included because this person bought a puppy from us"* — that is the thing Matt asked for and it
does not exist yet.

Storage bucket **`training-videos` exists and is PUBLIC**. See §4 — that is a problem for paid content.

---

## 1 · The access model — get this right and everything else is easy

Three states, one column. **Extend `access_tier`, do not invent a second flag** — two overlapping
permission fields is how content leaks.

```
public   visible to anyone, including the marketing site. A teaser.
owner    included free for a client who has a dog allocated to them. THE NEW ONE.
paid     requires a bundle purchase. The future product.
```

Migrate: `free` → `public`, `bundle` → `paid`. Keep the old values accepted for one release so a
half-deployed app does not blank the library.

**`owner` is earned by holding a dog, not by having an account.** A client with a portal login and
no dog sees only `public`. Enforce this in **RLS on `training_videos`**, not in a component — the
same mistake that exposed every public dog to every client on 20 August was a component-level filter.

The check is: does this user have a row linking them to a dog — allocation, reservation or a
completed sale. Write it as a `SECURITY DEFINER` helper (e.g. `public.client_owns_a_dog()`), and
**do not revoke EXECUTE on it from `authenticated`** — doing that to an RLS helper caused a 6.7 hour
public outage in July.

## 2 · The toggle Matt asked for

On the admin video row: a three-way control — **Public · Included with a puppy · Paid extra**.

- Changing it takes effect immediately for every client, with no redeploy.
- Show the count next to each option: *"Included with a puppy — 18 videos, seen by 9 clients"*.
- Changing a video from `owner` to `paid` **revokes access from people who could see it yesterday**. Warn plainly before saving, and write an `audit_log` row. This is the single most annoying thing you can do to a paying customer, so it must be deliberate.
- Bulk-set the tier for a whole category. Matt will fill the Puppy Curriculum first and flip all 13 at once.

## 3 · Uploading, because the library is empty

All 30 rows have **no video file**. The admin side is where Matt will spend his time, so make it
fast and forgiving.

- Upload from the **website** (drag and drop, multiple at once, resumable) and from the **app** (pick from the phone library — he films on his phone at the kennel).
- Accept `mp4, mov, m4v, webm`. Verify magic bytes — reuse `src/lib/uploads/magic.ts`; do not write a second validator.
- Generate a **thumbnail** automatically and fill `duration_seconds`. A grid of grey rectangles looks broken.
- **A row with no `video_url` must never render as a playable card.** Show it in admin as *"Awaiting footage"* and hide it from clients entirely, however its tier is set.
- Upload progress that survives a page change, and a clear failure message. A 400 MB upload that dies silently at 90% will cost him an evening.

## 4 · The bucket is public and that will not do

`training-videos` is a **public** bucket. Anyone with the URL can watch, forever, without an account
— which means the moment Matt sets a price, the product is already free to anyone who shared a link.

- Make the bucket **private** and serve every video through a **short-lived signed URL** issued after the access check.
- `public`-tier videos are still served by signed URL. Same path for all three tiers — one code path, no "it works for free videos" bugs.
- **Migrate the existing rows' URLs when you flip the bucket.** Flipping it without rewriting stored URLs breaks all 30 rows — that is exactly what happened to `documents` and is why the kennel documents page is showing nothing right now.
- Verify the change by fetching a raw `/object/public/training-videos/...` URL and confirming it fails.

## 5 · The client's view

Matt's note on the mockup: **too basic.** DogBreederPro sets a low bar and we are not competing with
it — the buyer is comparing us to Netflix, not to a kennel database.

- **Continue watching** at the top, from `video_watch_progress`. Resume at the second, do not restart.
- Categories as **cards with a real thumbnail and a progress ring**, not a text list.
- Inside a category, ordered by `week_label` where set — the Puppy Curriculum is a *journey*, and week 1 next to week 8 is the whole value.
- A **locked** `paid` video is **shown, not hidden** — thumbnail, title, duration, and *"Part of the Advanced bundle"*. Hiding it sells nothing.
- Works on a phone in the dark at 11pm with a puppy chewing something. Big tap targets, no hover-only controls.

## 6 · The marketing side

`public` videos appear on the website's Training page, without a login, with a clear
*"Buyers get the full library"* line. This is the top of the funnel for the paid product.

## 7 · Do not build the payment flow yet

`video_bundle_purchases` has **0 rows** and there is no checkout. Leave it that way.

- `paid` tier locks correctly and shows the bundle name and price.
- The unlock path is a single function with one caller — so wiring a real payment later is one change.
- **No pricing is displayed to clients until Matt sets it.** Do not invent a number.

---

## The app

Everything above already half-exists in the app. **Do not rebuild it — align it.**

- Update `hooks/useTrainingVideos.ts` for the three tiers.
- `TrainingVideosTab.tsx` gets the same tier chips as the website.
- `play/[videoId].tsx` uses signed URLs and writes `video_watch_progress`.
- Add upload-from-phone to the admin training screen.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- One `access_tier` column. No second permission flag.
- Access enforced by **RLS**, never only in a component.
- Never revoke EXECUTE on an RLS helper function.
- Bucket private, everything by signed URL, existing URLs migrated in the same change.
- A video with no file never reaches a client.
- No payment flow. No invented prices.
- Nothing auto-emails a client — Matt sends messages.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Migration ran: `select access_tier, count(*) from training_videos group by 1` — paste it. Expect `public`/`owner`/`paid` only.
- [ ] `training-videos` bucket is **private**: paste `select name, public from storage.buckets`.
- [ ] A raw `/object/public/training-videos/...` URL **fails**. Paste the response.
- [ ] All 30 existing rows still resolve after the bucket flip. Paste the count that produce a working signed URL.
- [ ] A client **with** an allocated dog sees `owner` videos. **Test with a real JWT**, not the UI.
- [ ] A client **with no dog** sees only `public`. Same JWT test. Paste both row counts.
- [ ] A logged-out visitor sees only `public`.
- [ ] Query `training_videos` directly as `anon` and as a dogless client — paste the row counts. **This is the RLS proof; the UI proves nothing.**
- [ ] Flipping one video from `owner` to `paid` warns first, writes `audit_log`, and that client immediately loses it.
- [ ] Bulk-setting Puppy Curriculum (13 videos) works in one action.
- [ ] Uploading a real `.mp4` from the website stores it, sets `video_url`, `duration_seconds` and a thumbnail. Paste the row.
- [ ] A `.exe` renamed `.mp4` is rejected on magic bytes.
- [ ] A row with an empty `video_url` shows "Awaiting footage" in admin and **is absent from the client list**. Paste both.
- [ ] Continue-watching resumes at the right second after closing and reopening.
- [ ] A `paid` video renders locked with its bundle name — visible, not hidden.
- [ ] `public` videos render on the website Training page logged out.
- [ ] No price is shown anywhere. Confirm.
- [ ] App: same three tiers, signed-URL playback, upload from the phone. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] `git status --porcelain` is empty. **Right now the website has 360 uncommitted files and the app has 775 — the documents fix is among them and that is why documents show nothing in production. Do not add to that pile.**
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the tier migration and RLS, the bucket privacy change and
URL migration, admin upload, the admin tier toggle, the client library, the public marketing page,
app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
