# CURSOR PROMPT — A bred puppy shows its newest photo; a kennel dog shows the one Matt picked

Two different populations, two different rules. Right now both behave the same way, and both are
wrong for the same reason.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The rule

| population | `dogs.status` | count | profile photo |
|---|---|---|---|
| **Puppies we bred** | `sold`, `in_training` | 132 | **the newest photo, automatically** — they grow, and a buyer or trainer should see the dog as it is now |
| **Our own dogs** | `keep`, `stud`, `retired` | 13 | **the photo Matt chose.** These are the stud and brood cards that sell the kennel; he picks the shot |
| Historic | `deceased` | 28 | chosen if one exists, else newest |

## The cause — this is the whole bug

`src/components/admin/MediaManager.tsx` line 43, on every upload:

```ts
is_primary: media.length === 0,
```

**The first photo ever uploaded is silently flagged as the cover, permanently.** Nobody chose it. It
is simply whichever picture happened to be added first — usually the youngest puppy shot.

The database confirms it. Every single dog that has photos has exactly one primary:

```
sold          22 dogs with photos   22 have a primary
in_training    2                     2
keep           8                     7
stud           4                     3
```

That is not Matt curating covers. That is the auto-flag firing 38 times.

So a "prefer the newest photo" rule alone **will not fix anything** — `is_primary` outranks it, and
`is_primary` is always sitting on the oldest photo.

## 1 · `is_primary` must mean "Matt chose this"

- **Stop auto-setting it on upload.** Remove `is_primary: media.length === 0`. Check the app's
  uploader for the same line and remove it there too.
- A dog with no chosen cover falls through to the rule for its population. That is correct, not a gap.

## 2 · Clear the auto-set covers on bred puppies — and only those

The 24 `sold` and `in_training` dogs have covers nobody picked, all sitting on the oldest photo.
**Clear `is_primary` for those two statuses only**, so the newest photo starts showing.

```sql
update dog_media m set is_primary = false
  from dogs d
 where d.id = m.dog_id and d.status in ('sold','in_training') and m.is_primary;
```

Write it as a migration in **both** `supabase/migrations` folders with the same number — the two
folders were reconciled to 134 identical files on 26 Aug and must stay that way. Check the next free
number across both.

**Do not touch `keep`, `stud` or `retired`.** Their covers were auto-set too, but clearing them would
strip the hero shot off the studs and brood bitches with nothing chosen to replace it. Instead, tell
Matt in the release note that those 10 covers were never deliberately chosen and he may want to
re-pick them — the picker already exists.

## 3 · One shared helper

This line is duplicated in at least six places across the two repos:

```ts
const photo = dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url;
```

`media[0]` is insertion order, so even the fallback returns the oldest. Replace every copy with one
helper — `src/lib/dogs/profilePhoto.ts` on the website and the matching path in the app, kept in
lockstep the way `lib/thumbs.ts` already is:

```
1. A chosen primary wins.
2. Otherwise the most recent by uploaded_at.
3. Otherwise the placeholder initial.
```

Known call sites, and there are more:

```
diedericks-dobermanns/components/dogs/DogCard.tsx:17
diedericks-dobermanns/components/dogs/DogDirectoryCard.tsx:59
diedericks-dobermanns/components/dogs/PublicPhotoGallery.tsx:81
diedericks-dobermanns/components/dogs/detail/DogOverviewTab.tsx:46
diedericks-dobermanns/components/heats/HeatCurrentTab.tsx:88
diedericksdobermann-web/src/components/portal/PortalDogThumb.tsx
```

## 4 · Make the choice visible where it matters

The picker exists on both platforms already — `DogMediaTile` / `MediaManager` on the website,
`ManagedMediaTile` with `onSetCover` on the app. **Do not build a second one.**

- On a **kennel-owned** dog, show which photo is the cover and make "Set as profile photo" obvious.
- On a **bred puppy**, show *"Showing the most recent photo"* with the option to pin one instead.
  Matt should be able to override on any dog; the difference is only what happens when he has not.

## Fetch enough to sort by

Several queries select only `dog_media(url, is_primary)` — there is nothing to order by:

```
src/lib/health/constants.ts:11        HEALTH_DOG_SELECT
src/lib/heats/queries.ts:27
src/lib/portal/reservation.ts:41
```

Add `uploaded_at`, and `thumbnail_url` where missing. `src/lib/portal/dogs.ts` already has
`thumbnail_url`; add `uploaded_at` there too. Prefer the thumbnail — 235 of 277 rows have a real one.

**Do not use `next/image`.** Vercel's optimizer is over quota and returns 402. Use `src/lib/thumbs.ts`.

## Rules

- `is_primary` is only ever written by a deliberate click. Never on upload.
- Clear it for `sold` and `in_training` only. Leave the kennel's own dogs alone.
- One helper. No duplicated `find(is_primary) ?? media[0]` left in either repo.
- New migration in **both** folders, same number, identical bytes.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] `git grep -n "is_primary: media.length === 0"` returns **nothing** in either repo.
- [ ] `git grep -n "is_primary) ?? "` returns **nothing** in either repo.
- [ ] Paste before and after: `select d.status, count(*) filter (where m.is_primary) from dogs d join dog_media m on m.dog_id=d.id group by d.status;` — `sold` and `in_training` go to 0, the rest unchanged.
- [ ] Upload a newer photo to a dog in training. Its card switches to the new photo. Screenshot before and after.
- [ ] Pin an older photo on that same dog. The card switches back. Screenshot.
- [ ] A `stud` still shows its existing cover — **prove the migration did not touch it.**
- [ ] Josef's portal card still shows Puppy 1 (Pink). She is `sold`, so confirm which photo now shows.
- [ ] Unit test on the helper: chosen wins; none chosen picks newest; empty returns null.
- [ ] Both migration folders still byte-identical: `for f in $(ls $W); do cmp -s "$W/$f" "$A/$f" || echo "DIFFERS: $f"; done`
- [ ] App: same behaviour on a real device. Say which.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: removing the auto-primary, the migration, the shared helper
and call sites, the picker wording, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
