# CURSOR PROMPT — Show the puppy's photo in the client's "Your Dogs" card

Josef opens his portal and sees his puppy's name as a line of text. The photo exists, the query
already fetches it, and nothing renders it. **The first thing a buyer wants to see is their dog.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — the data is already there

`src/lib/portal/dogs.ts` line 17 already selects it:

```ts
"id, name, colour, sex, status, date_of_birth, breed, microchip_number, dog_media(url, is_primary)"
```

So `dog.dog_media` is populated on every row. **`src/lib/portal/dogs.ts` is on the do-not-modify
list — you do not need to touch it.**

The gap is `src/app/portal/(panel)/page.tsx` around **line 187**, inside the `Your Dogs`
`PortalSurfaceCard`. Each `<li>` renders the name, a subtitle line and a "Request training" link,
and never touches `dog_media`.

`dog-media` is a **public** bucket, so `url` is directly usable. Nine Claire × Santini puppies now
have photos loaded.

## What to change

- Add a **square thumbnail** to the left of the name in each `Your Dogs` row: around 56px, `rounded-sm`, `object-cover`, gold hairline border to match the card.
- Use the row where `is_primary` is true; fall back to the first photo; **if there is none, render a quiet placeholder** — the dog's initial on `--surface`, never a broken image and never a grey box with an icon.
- The thumbnail links to `/portal/dogs/{id}`, same as the name. Buyers tap pictures.
- Use `next/image` with explicit `width` and `height` so the card does not jump while it loads.
- Keep "Request training" exactly where it is on the right.

**Puppy 3 (Gold) has no photo at all** — Jannecke Smit's. She is the live test for the placeholder
path, so check her row specifically.

## The app

The app's portal home has the same card and the same gap. Same thumbnail, same fallback, same tap
target. On a phone the image can be larger — this is the emotional centre of the screen, not a
decoration.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Do not modify `src/lib/portal/dogs.ts`.
- No broken images, ever. A missing photo is a quiet initial.
- `next/image` with fixed dimensions; no layout shift.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] Josef's portal shows Puppy 1 (Pink)'s photo next to her name. Screenshot.
- [ ] The thumbnail links through to the dog profile.
- [ ] **Jannecke Smit's Puppy 3 (Gold), which has no photo, shows the initial placeholder** — not a broken image. Screenshot.
- [ ] A client with two dogs shows both thumbnails.
- [ ] No layout shift as the images load.
- [ ] App: same card, same fallback. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
