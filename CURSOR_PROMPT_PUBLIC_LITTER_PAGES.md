# Cursor Prompt — Public Litter Pages with Live Weights & Milestones

## Context
Diedericks Dobermanns app + website (`diedericksdobermann-web`, Next.js 15, shares the same Supabase DB `nlmwxodvquwbjinhhbmr`). Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text, Cinzel/Lato.

Research-backed feature (top competitor differentiator): buyers waiting for a puppy obsessively refresh a public litter page showing live weights, milestones, and photos. ALL the data already exists — `litters`, `dogs` (puppies linked by litter), `weight_logs`, `litter_media`, growth benchmark logic in `useGrowthBenchmark`/`lib`. This is a curated READ-ONLY view, not a new system.

## Task 1 — RLS check first (do not skip)
Public (anon) must be able to read ONLY: litters marked public (check the existing `is_public` or equivalent flag on litters — find the real column), their puppies' non-sensitive fields (name/collar colour/sex/colour/DOB/status/photos/weights), and `litter_media` for those litters. Verify existing anon SELECT policies cover this; if a policy is missing, write a migration adding a narrow anon SELECT policy (never widen an existing one). NEVER expose: buyer names, `reserved_by`, prices, microchip numbers, admin notes.

## Task 2 — App: enrich `app/(public)/litters/[id]`
The public litter detail screen exists — enrich it:
- Puppy cards: photo, collar colour dot, sex, current status badge (Available / Reserved — no names), latest weight + small sparkline or the existing growth chart component reused in read-only mode.
- Milestones strip: age in days/weeks, eyes-open / weaned / first-vacc style milestones if milestone data exists (check schema — if there is no milestones table, derive simple age-based labels from DOB, do NOT create a new table).
- Photo gallery from `litter_media` (public items only).
- Empty/loading/error states per house style.

## Task 3 — Website: mirror page
`diedericksdobermann-web`: add/enrich the litter detail route with the same data (server components, same anon Supabase client pattern the site already uses). Match existing site styling. Add the litter page link to the site's Litters index.

## Warnings
- Read-only. No admin UI changes. No new tables unless truly required (milestones derivation preferred).
- Reuse the existing growth benchmark components/queries — do not rebuild charting.
- No file over 300 lines. `npx tsc --noEmit` clean in BOTH repos.

## Testing checklist
- [ ] Logged-out user sees a public litter's puppies, weights, photos
- [ ] No buyer names, prices, or microchips anywhere in the anon API responses (check the network payload, not just the UI)
- [ ] Non-public litters return not-found for anon
- [ ] Website page renders the same litter correctly
