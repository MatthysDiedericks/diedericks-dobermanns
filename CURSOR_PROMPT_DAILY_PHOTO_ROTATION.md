# Cursor Prompt — Make the dog photos actually rotate

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Everything needed is already in the database.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Why it looks the same every day

Matt says the rotation "changes, but not enough". It is worse than that. Measured against the
live database on 15 Sep 2026:

| | |
|---|---|
| Public dogs | **31** |
| Public photos across those dogs | **254** |
| Photos that can ever appear on a card | **31** — one per dog |
| Photos never seen by anyone | **223** |

Three separate causes, and each one has to be fixed or the others do not show:

**1. The website does not rotate at all.** `lib/dogs/dailyOrder.ts` exists only in the Expo app.
The website's Our Dogs page (`src/app/(site)/dogs/page.tsx:59`) orders by
`created_at desc` — a fixed order that changes only when a dog is added. If Matt has been
looking at the website, nothing has moved for weeks.

**2. In the app, only the home screen rotates.** `app/(public)/index.tsx:46` calls
`sortByDailySeed` on the featured strip. Nothing else does.

**3. Even where it rotates, every dog shows the same single photo.** `pickProfilePhoto` returns
the pinned cover, or failing that the newest by `uploaded_at`. Neither changes from one day to
the next. So the shuffle reorders 31 cards that each show a fixed image — on a full grid that is
almost imperceptible, which is exactly what Matt is describing.

Hunter-King has **36** public photos and shows one. Cleopatra has **31**. Cait 19, Cuba 15.

---

## The design decision that matters

**13 of the 31 dogs have a pinned cover (`is_primary`). Those must not move.**

A pin is a deliberate click — Matt choosing the shot that represents that dog. Rotating past it
would overrule him, and the existing comment in `profilePhoto.ts` is explicit that `is_primary`
is never written automatically. Honour it.

The other **18 dogs have no pin**, and today fall back to "newest photo", which is just as frozen
as a pin but nobody chose it. Those are the ones to rotate.

So the rule becomes:

> Pinned cover → always that photo.
> No pin → a different photo each day, chosen from that dog's public photos by the same daily seed.

That gives real daily change without overriding a single deliberate choice. It also gives Matt a
meaningful control: **pin a photo to freeze it, unpin to let it rotate.**

## Task 1 — Put the daily seed in both repos

`lib/dogs/dailyOrder.ts` is already correct — MD5 of `dateKey + id`, Africa/Johannesburg calendar
day, deterministic so every visitor sees the same order on the same day. **Copy it to the website
as `src/lib/dogs/dailyOrder.ts`, byte-identical apart from import style.** Copy
`dailyOrder.test.ts` with it.

Do not rewrite the hash. It matches Node's `createHash('md5')` and Postgres `md5()`, and that
equivalence is worth keeping.

## Task 2 — Rotate the photo inside each dog

In `profilePhoto.ts` — **both repos, kept in lockstep as the file header already demands** — change
the fallback branch of `pickProfilePhoto`:

```ts
export function pickProfilePhoto<T extends ProfilePhotoInput & { id?: string }>(
  media: T[] | null | undefined,
  now: Date = new Date(),
): T | null {
  const photos = (media ?? []).filter(isPhoto);
  if (photos.length === 0) return null;

  // A pinned cover is a deliberate choice. It never rotates.
  const pinned = photos.find((m) => m.is_primary);
  if (pinned) return pinned;

  // No pin: show a different one each calendar day, stable for all visitors.
  // Sorting by recency first keeps the order deterministic when uploaded_at ties.
  const stable = [...photos].sort((a, b) => recency(b).localeCompare(recency(a)));
  const dateKey = calendarDateKey(now);
  const index = seedIndex(dateKey + (stable[0]?.id ?? ''), stable.length);
  return stable[index] ?? null;
}
```

Add `seedIndex` to `dailyOrder.ts` — take the first 8 hex characters of the MD5, parse base 16,
modulo the length. Keep it in that file so there is one seeding implementation, not two.

**Seed on something stable per dog, not on the photo.** Seeding on the chosen photo's id would
make the choice depend on itself. Seeding on the dog's id is cleaner — thread `dogId` through if
the call sites can supply it, and fall back to the first photo's id if not. Say which you did.

`pedigreePhotoUrl` must keep returning the pinned pedigree photo unchanged — a certificate that
changes its portrait daily is wrong.

## Task 3 — Rotate the order on the website too

`src/app/(site)/dogs/page.tsx`: keep the database query as it is, then apply `sortByDailySeed` to
the result before rendering. Do the same anywhere else the website shows a public strip or grid of
dogs — home page, litter pages, anywhere a visitor sees several dogs at once.

**Leave `revalidate = 60` alone.** Sixty seconds is fine; the calendar day advances well within it.
Do not switch the page to `force-dynamic` — that would cost a database round trip on every visit
for a page that changes once a day.

**Do not rotate anything in the admin area or the client portal.** In admin, a list that reorders
itself daily makes a dog harder to find, and in the portal a client wants to see *their* dog in a
predictable place. This is a shop-window feature only.

## Task 4 — A test that proves it changes

Extend `dailyOrder.test.ts`, in both repos:

- Same date twice → identical result (already covered, keep it)
- Consecutive days → **the chosen photo differs for a dog with several photos**
- A dog with a pinned cover → the same photo on both days
- A dog with exactly one photo → that photo on both days, no crash
- Over 14 consecutive days, a dog with 10 photos should show **at least 5 distinct** ones —
  a weak assertion on purpose, because a hash will repeat sometimes and a strict "all different"
  test would be flaky

That last one is the test that would have caught this. The current tests only assert the order is
deterministic, which it was — while showing the same 31 images for weeks.

---

## Do not

- Do not write `is_primary` automatically, ever. It is Matt's pin.
- Do not use `Math.random()` or anything time-of-day based. Two visitors on the same day must see
  the same thing, and Matt must be able to reproduce what a client reports seeing.
- Do not change the pedigree certificate photo.
- Do not rotate in admin or the portal.
- Do not add a migration.

---

## Report

1. The photo Hunter-King's card shows today and tomorrow — run the function with two dates and
   paste both filenames. He has 36 photos and no excuse to be static.
2. The same for a pinned dog, showing it does **not** change.
3. Screenshot of the website Our Dogs grid, and the same page with the clock advanced a day.
4. Confirmation the admin dog list and the client portal are unchanged.
5. The new tests passing in both repos.
6. `npx tsc --noEmit` clean in both repos.
