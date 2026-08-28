# CURSOR PROMPT — Make the buyer's dog photo a portrait, not an avatar

The photo now loads. It is 56px square, and at that size Josef sees a pink collar and a crop of an
ear. **This is the first thing a paying buyer sees when they open the portal.** It should look like a
kennel portrait, not a contact thumbnail.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## 1 · The tile

`src/components/portal/PortalDogThumb.tsx` — currently a 56px square.

- **104 × 130 (4:5 portrait)** on desktop, **88 × 110** below `sm`. Set both dimensions explicitly so
  nothing shifts while the image loads.
- **Portrait, not square.** A dog photographed standing or sitting is taller than it is wide; a
  square crop throws away the animal and keeps the background.
- `object-fit: cover` with **`object-position: 50% 30%`**. Centre-cropping a dog photo lands on the
  chest and collar — the head sits in the upper third. This one line is most of the improvement.
- Keep `rounded-sm`, keep the gold hairline border, and raise it to `border-gold/45` so the heavier
  tile still reads as deliberate rather than as a floating rectangle.
- The tile stays a link to `/portal/dogs/{id}`.

**Rename the component to `PortalDogPortrait`** and update its imports. `Thumb` stops being an
honest name at this size.

## 2 · Request a big enough source

`src/lib/thumbs.ts` currently offers `avatar` at 200px — that is the 2× source for a 100px box, so a
130px-tall tile would be upscaled and soft.

Add a size key rather than changing `avatar`, which other callers depend on:

```ts
portrait: { width: 320, quality: 82 },
```

Then use `supabaseThumbSrcSet(url, "portrait")` and set both `src` and `srcSet`.

**Do not use `next/image`.** Vercel's optimizer returns `402 PAYMENT_REQUIRED` on the Hobby plan —
that is what made this photo blank in the first place. `src/lib/thumbs.ts` routes through Supabase's
own render endpoint and cannot 402. Keep it that way.

Prefer `dog_media.thumbnail_url`, fall back to `url`.

## 3 · Balance the row

A taller image beside one line of small text looks unfinished. Rework the row in
`src/app/portal/(panel)/page.tsx` (the `Your Dogs` card):

- Increase the gap between tile and text to `16px`.
- Give the dog's name more presence: **Cinzel, `text-[17px]`**, still linking to the profile.
- Split the subtitle across two lines — `female · 6 weeks` on one, `Born 10 Jul 2026` on the next.
  One long grey run beside a 130px tile reads as a caption; two short lines read as a record.
- Align "Request training" to the **bottom** of the row so it sits on the tile's baseline instead of
  floating in the middle.
- Increase the vertical padding on each `<li>` so two dogs do not touch.

## 4 · The placeholder scales too

The initial-letter fallback is correct behaviour and stays. Scale it with the tile: same 104 × 130
box, Cinzel, `text-3xl`, gold on `--surface`. **Jannecke Smit's Puppy 3 (Gold) is the live test** —
check her row specifically.

---

## The app

This matters more on a phone than on a laptop, because that is where buyers actually open it.

- Same portrait ratio, same `50% 30%` crop, same fallback.
- Size it generously — **roughly 120 × 150** on a phone. Do not simply mirror the web numbers.
- `lib/thumbs.ts` in the app is kept in lockstep with the website's copy. **Add the same `portrait`
  key there and confirm the two files still match.**
- The app is unaffected by the Vercel 402, but it should still prefer `thumbnail_url` — that is
  bandwidth on a mobile connection.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- No `next/image` for Supabase-hosted photos.
- Explicit width and height on every image. No layout shift.
- A missing photo is a quiet initial, never a broken image and never a grey icon box.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] Josef's portal shows Puppy 1 (Pink) as a portrait with **her head in frame**. Screenshot.
- [ ] Paste the result of this in the console on that page:
```js
[...document.querySelectorAll('img')].map(i=>({w:i.naturalWidth,box:i.width+'x'+i.height,src:i.currentSrc.slice(0,80)}))
```
  Expect `naturalWidth ≥ 260`, a `104x130` box, and a `render/image` URL. **No `/_next/image`.**
- [ ] Jannecke Smit's Puppy 3 (Gold) shows the scaled initial placeholder. Screenshot.
- [ ] A client with two dogs — both portraits, even spacing, no overlap. Screenshot.
- [ ] Nothing jumps as the images load.
- [ ] On a 375px-wide viewport the row still fits and "Request training" is not squeezed. Screenshot.
- [ ] App: same portrait on a real device. Say which device.
- [ ] `grep -rn "PortalDogThumb" src` returns nothing — the rename is complete.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the `portrait` size key, the component rename and resize,
the row layout, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
