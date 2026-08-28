# CURSOR PROMPT — The puppy photo is blank, and the preview crashes on Video Library

Two live faults, both found and proven today. Neither is a guess — the evidence is below.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## 1 · The puppy photo is blank because Vercel's image optimizer is out of quota

Josef's "Your Dogs" card shows the letter **P** instead of his puppy. The photo is fine. The data is
fine. **Vercel is refusing to serve it.**

Proven on the live site:

```
GET https://nlmwxodvquwbjinhhbmr.supabase.co/storage/v1/object/public/dog-media/
    dogs/fcd29f74-d6a3-4199-b16c-edba0f69b995/puppy1-pink-01.jpeg
→ 200, image/jpeg, 283209 bytes, naturalWidth 1000        ✅

GET https://www.diedericksdobermanns.com/_next/image?url=<that same url>&w=64&q=75
→ 402 PAYMENT_REQUIRED
  Code: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED           ❌
```

The Hobby-plan image-optimization allowance is spent. Every `next/image` on the site returns 402
until the billing period rolls over — and it will run out again next month.

**Do not fix this by upgrading the plan, and do not set `images.unoptimized`.**

### The rest of the site already solved this — copy it

`/dogs` renders 31 photos and **all 31 load**. It never touches `next/image`. It uses
`src/lib/thumbs.ts`, which rewrites a Supabase object URL onto Supabase's own transformation
endpoint:

```
/storage/v1/object/public/…  →  /storage/v1/render/image/public/…?width=200&quality=80
```

That is served by Supabase, costs nothing on Vercel, and cannot 402.

`src/lib/thumbs.ts` already exports exactly what is needed:

```ts
supabaseThumbSrcSet(url, "avatar")   // → { src, srcSet } at 100px / 200px
IMAGE_SIZES.avatar = { width: 200, quality: 80 }
```

**Change `src/components/portal/PortalDogThumb.tsx`:**

- Drop `next/image`. Use a plain `<img>` with `width`/`height` set to `56` so nothing shifts.
- Build the source with `supabaseThumbSrcSet(url, "avatar")` and set both `src` and `srcSet`.
- Prefer `dog_media.thumbnail_url` when present, and fall back to `url`. **235 of 277 `dog_media`
  rows already have a real thumbnail** (a separate, smaller file — none of them merely duplicate
  `url`). The component currently ignores that column entirely.
- Keep the existing `onError` → initial-placeholder fallback exactly as it is. It is the reason this
  degraded quietly instead of showing a broken image, and it is correct behaviour.
- Keep `loading="lazy"` and `decoding="async"`.

`src/lib/portal/dogs.ts` selects `dog_media(url, is_primary)` and **is on the do-not-modify list.**
`thumbnail_url` is therefore not currently fetched. Add it to `PORTAL_DOG_SELECT` — this is the one
sanctioned exception, it is a single column addition, and the `PortalDog` type must be widened to
match. Change nothing else in that file.

**Then check `src/components/ui/PendingUploadPreview.tsx`** — the only other `next/image` in the
codebase. If it renders a remote Supabase URL it has the same 402. If it only previews a local
`blob:`/`data:` URL, say so and leave it alone.

### Stop the gap re-opening

**42 of 277 `dog_media` rows have no `thumbnail_url`**, including all 14 Claire × Santini photos
loaded on 26 August by `scripts/upload-litter-photos.mjs` — that script never wrote the column.

- Fix the script so every future upload writes a real thumbnail.
- Write `scripts/backfill-dog-thumbnails.mjs` to generate the 42 missing ones. It runs on Matt's
  machine — **the sandbox has no network access to Supabase, so do not try to run it here.**
- With `thumbnail_url` populated the render endpoint has less work to do, but the transform is what
  actually protects us. Both matter.

---

## 2 · The preview crashes on Video Library because the route falls through

Reproduced live, and Matt's automatic error capture caught it independently:

```
Path: /admin/clients/da1b8f94-9a0c-4e4a-a0ac-c4ad85f85520/view-as/training/videos
Digest: 1909710358
```

`/portal/training/videos` on its own is **fine**. It only breaks inside the preview.

`src/app/admin/(preview)/clients/[id]/view-as/[[...slug]]/page.tsx` matches in order, and
`training/videos` is caught by this branch before anything else can claim it:

```ts
if (section === "training" && rest[0]) {
  const { default: Page } = await import("@/app/portal/(panel)/training/[id]/page");
  return <Page params={Promise.resolve({ id: rest[0] })} />;   // id = "videos"
}
```

So the training-session detail page runs a query with `id = "videos"` against a `uuid` column.
Postgres raises `22P02 invalid input syntax for type uuid`, and the error boundary catches it.

The sidebar in preview links straight to this URL, so it is one click away for anyone previewing a
client.

**Add the missing branches above the `training && rest[0]` catch-all:**

- `training/videos` → `@/app/portal/(panel)/training/videos/page`
- `training/videos/play/{videoId}` → `…/training/videos/play/[videoId]/page`
- `training/videos/{categoryId}` → `…/training/videos/[categoryId]/page`

Order matters — the `play` case must be tested before the bare `{categoryId}` case, or `play` will
be read as a category id and fail the same way.

**Then close the whole class of bug, not just this one instance.** Every `rest[0]` branch in that
file feeds a value straight into a `uuid` column. Add one guard and use it everywhere:

```ts
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

A segment that should be an id and is not a UUID must `notFound()` — a clean 404, never a 500.
`dogs`, `invoices`, `contracts`, `quotes`, `health`, `training` and `puppy-tracker` all need this.

---

## 3 · The preview greets the admin, not the client

While previewing Josef Kotze's portal the page reads **"Welcome back, Felicia"** — the signed-in
admin's name. Verified live.

`src/app/portal/(panel)/page.tsx` line 88:

```ts
const firstName = (profile?.full_name ?? "there").split(" ")[0];
```

`profile` comes from `requireClient()`, which is always the **session** user. The page already
fetches `fullProfile` for the **resolved** user (`resolvePortalUserId`) a few lines earlier. Use
that for the greeting and fall back to `profile` only when it is null.

A preview that shows the wrong person's name is not a preview — Matt cannot trust what he is
looking at.

---

## The app

- `diedericks-dobermanns/lib/thumbs.ts` is the counterpart file and `src/lib/thumbs.ts` carries a
  comment saying the two are kept in lockstep. **Verify they still match after your change and say
  so explicitly.**
- The app is not affected by the Vercel 402 — it never calls `/_next/image`. It **is** affected by
  the ignored `thumbnail_url`: the app's dog list should prefer the thumbnail for the same reason,
  which is bandwidth on a phone.
- Items 2 and 3 are website-only. There is no view-as preview in the app. Say so rather than
  inventing one.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- No `next/image` for Supabase-hosted photos. Use `src/lib/thumbs.ts`.
- Do not set `images.unoptimized`, and do not remove `remotePatterns` — leave the config alone.
- A missing photo stays a quiet initial. No broken images, ever.
- A bad URL segment is a 404, never a 500.
- Only one change to `src/lib/portal/dogs.ts`: adding `thumbnail_url` to the select.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] Josef's portal shows Puppy 1 (Pink)'s photo. Screenshot.
- [ ] In the browser console on that page, paste the result of:
```js
[...document.querySelectorAll('img')].map(i=>({src:i.currentSrc.slice(0,80),w:i.naturalWidth}))
```
  Expect `naturalWidth > 0` and a `render/image` URL. **No `/_next/image` anywhere.**
- [ ] `grep -rn "next/image" src` returns nothing under `src/components/portal/`.
- [ ] Jannecke Smit's Puppy 3 (Gold) still shows the initial placeholder, not a broken image.
- [ ] `/admin/clients/da1b8f94-9a0c-4e4a-a0ac-c4ad85f85520/view-as/training/videos` renders the
      library. Screenshot.
- [ ] The same URL with a junk segment — `…/view-as/dogs/not-a-uuid` — returns **404**, not the
      error boundary.
- [ ] The preview header reads **"Welcome back, Josef"**. Screenshot.
- [ ] Run and paste — expect **0**:
```sql
select count(*) from dog_media where thumbnail_url is null;
```
- [ ] No new rows in `error_events` for these routes after the deploy. Paste the query.
- [ ] App: dog list uses the thumbnail. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the thumbnail rendering fix, the thumbnail backfill, the
preview routing guard, the preview greeting, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
`src/lib/portal/dogs.ts` — **one** change only, as described above.
