# CURSOR PROMPT — Pedigree Display (Mobile App + Website)
*Run in Cursor Agent mode with the `diedericksdobermann App` folder open as the workspace root. Complete tasks in order.*

---

## Context

**Project:** Diedericks Dobermanns · React Native/Expo SDK 56 mobile app + Next.js 15 website · TypeScript strict · Supabase (`nlmwxodvquwbjinhhbmr`)

Full multi-generation pedigree data is being imported from DogBreederPro into a new Supabase table.
This prompt builds the **display** for it — a proper pedigree chart on each dog's profile, in both
the mobile app and the website. Do NOT re-create the schema or import data — both already exist / are
in progress. This is display only.

### Schema already live (do NOT alter)
- `public.dogs.registered_name text` — full registered/pedigree name (e.g. "Dharkha Betelges of
  Raconti (IMP SER)"). The existing `name` / `call_name` remain the short display names used
  everywhere else — do NOT change how `name` is used in existing UI.
- `public.pedigree_ancestors`:
  - `dog_id uuid` → the own dog this pedigree belongs to
  - `position text` → S/D notation: `S`,`D` (gen 1 = parents), `SS`,`SD`,`DS`,`DD` (gen 2),
    `SSS`..`DDD` (gen 3), `SSSS`..`DDDD` (gen 4). S = sire side, D = dam side, read left→right as
    generations get deeper.
  - `generation int` (1–4+), `sort_order int` (top→bottom chart order within the whole tree)
  - `registered_name text`, `date_of_birth date`, `wrights_coi numeric`, `titles_health text`
    (titles + health codes like "IPO 1, ZTP 1A HD-A1" or "HD-1 CARDIO FREE")
  - `own_ancestor_id uuid` → set when this ancestor is itself one of the kennel's own dogs
    (link the node to that dog's profile)
- RLS is already set: public may read pedigree rows for `is_public = true` dogs; admins/trainers read all.
- Note: not every dog has a full 4 generations — some have 3 (14 rows) or fewer. Render whatever exists;
  never assume a fixed count.

---

## Task 1 — Mobile app: `useDogPedigree(dogId)` hook

Create `hooks/useDogPedigree.ts`:
- Fetches `pedigree_ancestors` for the dog ordered by `sort_order`, columns:
  `position, generation, registered_name, date_of_birth, wrights_coi, titles_health, own_ancestor_id`.
- Also returns the dog's own `registered_name` and `wrights_coi` if you fetch it, or accept them as args.
- Standard pattern `{ ancestors, loading, error, refresh }`, JSDoc, error handling. Empty = no pedigree recorded.

## Task 2 — Mobile app: `PedigreeTree` component

Create `components/dogs/PedigreeTree.tsx` (keep under 300 lines; split a `PedigreeNode` sub-component if needed):
- Renders a standard right-growing pedigree chart: the dog on the left, sire branch on top, dam branch
  on bottom, generations as columns to the right. On a narrow phone screen, make it **horizontally
  scrollable** (ScrollView horizontal) so 3–4 generations fit without cramping.
- Each node card shows: registered_name (bold), titles_health (small, gold), DOB if present, and COI if present.
- If `own_ancestor_id` is set, the node is tappable → navigates to that dog's profile in the app.
- Sire-side nodes and dam-side nodes get a subtle visual distinction (e.g. left border colour).
- Use the brand tokens (Colors from `@/constants/colors`) and NativeWind, matching existing dog-detail styling.
- Reconstruct the tree from `position` codes (S/D notation) — don't rely on array index. A helper that maps
  each position to its (generation, row) grid slot is the clean approach.

## Task 3 — Mobile app: wire it into the dog profile

- On the dog detail screen (admin `app/(admin)/dogs/[id]/index.tsx` and the public/portal dog detail if
  separate), add a **Pedigree** section or tab that renders `<PedigreeTree dogId={id} />`.
- Also surface the dog's own `registered_name` near the top of the profile (under the call name) and the
  dog's own Wright's COI if available.
- Only show the Pedigree section when there is pedigree data (hide on empty rather than showing a blank chart).

## Task 4 — Website: pedigree on the public dog page

In the Next.js site (`diedericksdobermann-web/`):
- Add a server-side fetch of `pedigree_ancestors` (+ `registered_name`) for the dog page.
- Render an equivalent pedigree chart (a CSS-grid pedigree table is ideal on web — generations as columns).
  Show registered_name, titles_health, DOB, COI per node. Link `own_ancestor_id` nodes to that dog's page.
- Keep it read-only and SEO-friendly (server component / static where possible). Respect the same public-only
  visibility (only render for public dogs).
- Match the premium dark/gold brand styling already used on the site.

## Task 5 — Regenerate types & typecheck

- Regenerate `database.types.ts` if you rely on the new columns/table, or use a local cast.
- `npm run typecheck` (app) must pass clean. Build the website (`npm run build` in the web folder) if quick.

---

## Testing checklist
- [ ] A dog WITH pedigree (e.g. Cendra or Odessa) shows a readable 3–4 generation chart on the app dog profile
- [ ] Chart scrolls horizontally on a phone without cramping; titles/health and COI show per node
- [ ] Tapping an ancestor that is an own dog (e.g. Cendra's sire = Hunter-King) opens that dog's profile
- [ ] A dog WITHOUT pedigree hides the section cleanly (no blank chart, no crash)
- [ ] registered_name shows on the profile alongside the call name
- [ ] Website dog page renders the same pedigree, public dogs only, styled on-brand
- [ ] `npm run typecheck` passes; no file over 300 lines; logic in hooks

## Critical rules
- Display only — do NOT create/alter the pedigree schema or import data.
- Do NOT change the meaning of `name` in existing UI; `registered_name` is a separate, additional field.
- Respect RLS/public-only visibility — never expose non-public dogs' pedigrees on the website.
- Verify real FK/column names against the live schema before querying; don't guess.
