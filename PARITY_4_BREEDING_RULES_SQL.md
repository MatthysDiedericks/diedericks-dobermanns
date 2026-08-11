# PARITY PROMPT 4 — Move the breeding rules into SQL (do this BEFORE the screens)

**Run this prompt on its own, before PARITY_5.** It is small, but it is the single most
important step in the whole parity plan.

## Why

The breeding programme rules — prohibited pairs, Line A/B constraints, the Bridge Sire plan,
COI thresholds — currently live **only in the mobile app's TypeScript**. If the website
reimplements them, you get two systems that can disagree about **which matings are legal**.
That is not a cosmetic drift; a website that permits a mating the app forbids is a genuine
breeding mistake with real consequences for the dogs and the programme.

Move the rules to one place — Postgres — so both clients ask the same question and get the
same answer.

## Read first

- `diedericks-dobermanns/app/(admin)/breeding/pairing-builder.tsx`
- `diedericks-dobermanns/app/(admin)/breeding/planner.tsx`
- `diedericks-dobermanns/app/(admin)/breeding/trial-planner.tsx`
- `diedericks-dobermanns/lib/breeding/` — wherever the rule logic actually sits
- `BREEDING_REFERENCE_GUIDE.md` at the project root
- Any `CURSOR_PROMPT_BREEDING_*` files — they document the intended rules

Extract every rule that is currently enforced in TypeScript. List them explicitly in your
reply before writing SQL, so the set can be checked.

## Build

A Postgres function, applied as a numbered migration in
`diedericks-dobermanns/supabase/migrations/`:

```sql
-- Returns the breeding legality + risk assessment for a proposed pairing.
create or replace function public.evaluate_pairing(p_sire_id uuid, p_dam_id uuid)
returns table (
  allowed boolean,
  severity text,        -- 'ok' | 'caution' | 'prohibited'
  coi_estimate double precision,
  reasons text[]        -- human-readable, shown directly in both UIs
)
language plpgsql stable security definer set search_path = public
as $$ ... $$;
```

Requirements:

- **`reasons` must be human-readable** and safe to show a user verbatim, so neither client
  writes its own wording. e.g. `"Same line (A) — line-to-line mating is prohibited"`,
  `"COI 12.4% exceeds the 10% threshold"`.
- Include the COI calculation. If the app computes COI in TS, port it — do not leave it split.
- `stable`, not `volatile` — it only reads.
- **Do NOT revoke EXECUTE from `anon`.** Revoking EXECUTE on functions took the public site
  down for ~7 hours on 4 Aug: Postgres evaluates every RLS policy, and a policy calling a
  function the role cannot execute aborts the whole query. Grant to `authenticated`, leave
  `anon` alone.
- Pin `search_path = public` (there is already one function flagged by the advisor for not
  doing this).

Then add a thin `evaluate_pairing` wrapper in each repo that calls the RPC:

- `diedericksdobermann-web/src/lib/breeding/evaluatePairing.ts`
- `diedericks-dobermanns/lib/breeding/evaluatePairing.ts`

## Then refactor the app to use it

Replace the app's inline TypeScript rule checks with calls to the RPC. **The app must
behave identically after this change** — that is the test. If any pairing the app used to
flag is no longer flagged, the port is incomplete.

## Verify

- [ ] List the extracted rules in your reply and confirm each is represented in SQL.
- [ ] For every existing row in `pairings`, `evaluate_pairing(sire_id, dam_id)` returns the
      same verdict the app currently shows. Any difference is a porting bug — investigate,
      do not paper over it.
- [ ] A known-prohibited pair returns `allowed = false` with a readable reason.
- [ ] `set local role anon; select 1 from dogs limit 1;` still works after the migration
      (proves no grant regression).
- [ ] App still builds: `npx tsc --noEmit` in the app repo.

## Commit

App repo (root is the **parent** folder, not `diedericks-dobermanns/`). `git add -A`,
one commit including the migration file. Migration files must be committed — the repo's
migration history is already the only record of schema that is live on the database.
