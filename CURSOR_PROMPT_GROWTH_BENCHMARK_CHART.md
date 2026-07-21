# Cursor Prompt — Litter-Size-Adjusted Growth Benchmark

## Context

Diedericks Dobermanns app. Stack: React Native (Expo SDK 56) + TypeScript strict, Supabase Postgres. Supabase project: `nlmwxodvquwbjinhhbmr`. Brand: background `#111008`, gold `#C4A35A`, text `#F5F0E8`.

**Already built and working — do not rebuild:**
- `hooks/useLitterWeights.ts` — loads puppies + `weight_logs` for a litter, returns `weightsByPuppyId: Map<string, PuppyWeightLog[]>`, `uniqueDates`, plus `logWeight`/`logWeightsBatch`/`deleteWeight`.
- `components/litters/PuppyGrowthChart.tsx` — SVG line chart, one coloured line per puppy, PDF export, tap-to-isolate legend. Wired into `app/(admin)/litters/[id]/index.tsx` via `LitterWeightsTab.tsx`.
- `components/dogs/detail/DogWeightPanel.tsx` / `DogHealthWeightSection.tsx` — single-dog weight view, wired into `DogHealthTab.tsx`.
- `lib/litters/weighingSchedule.ts` — has `getAgeDays(whelpDate, date)`, `formatWeightGrams`.
- `weight_logs` table (`dog_id, weight_kg, recorded_date, session, notes`) now has **1,234 historical weigh-ins across 137 puppies spanning 24 litters** (imported from DogBreederPro today) — this is the dataset the benchmark curve is computed from. RLS already correct (admins manage, trainers view) — do not touch RLS.
- `litters.puppy_count` exists on every litter — this is the field to bucket litter size by.

**What's missing (the actual task):** a background "expected weight for a puppy this age, from a litter this size" reference line, so admin/management can see at a glance whether a puppy is tracking above or below normal for its litter size. Per Matt's instruction: **bigger litters gain weight more slowly** — the benchmark must be bucketed by litter size, not a single flat average across all litters.

---

## Task 1 — Benchmark calculation (pure function, new file)

Create `lib/litters/growthBenchmark.ts` (keep under 150 lines):

1. `litterSizeBucket(puppyCount: number): 'small' | 'medium' | 'large'`
   - small: 1–5, medium: 6–9, large: 10+ (confirm bucket edges look right against the 24 imported litters — sizes ranged roughly 8–20 puppies per litter this session, so you may find `medium`/`large` need different cut points, e.g. 6–10 / 11+. Check actual distribution with a quick query before finalizing and say so in your summary.)

2. `computeBenchmarkCurve(historicalLogs: { litterPuppyCount: number; ageDays: number; weightGrams: number }[], bucket: 'small'|'medium'|'large', maxAgeDays: number): { ageDays: number; avgGrams: number }[]`
   - Filters historical logs to the matching bucket, groups by `ageDays` (integer day, computed from each puppy's own litter whelp date), averages `weightGrams` per day, returns a sorted array of `{ ageDays, avgGrams }` — one point per day where at least 3 historical data points exist (fewer than 3 is too noisy to show — skip that day rather than showing a misleading average).
   - This is a pure function — no Supabase calls inside it. It receives already-fetched rows.

## Task 2 — New hook: fetch the historical dataset

Create `hooks/useGrowthBenchmark.ts` (under 120 lines):

- Input: `litterPuppyCount: number` (the current litter's size, to pick the bucket).
- Fetches from Supabase: join `weight_logs` → `dogs` (for `litter_id`) → `litters` (for `actual_date` as whelp date and `puppy_count`), across **all litters**, not just the current one. Only select the columns needed: `weight_logs.weight_kg, weight_logs.recorded_date, dogs.litter_id, litters.actual_date, litters.puppy_count`.
- Computes `ageDays` client-side per row using the existing `getAgeDays()` helper from `weighingSchedule.ts` (reuse, don't duplicate).
- Calls `computeBenchmarkCurve()` from Task 1, memoized with `useMemo` keyed on the fetched data + bucket.
- Returns `{ benchmarkCurve, bucket, loading, error }`.
- This hook fetches once and can be cached loosely (it doesn't change often) — consider a simple in-memory cache keyed by bucket so switching between litters of the same size bucket doesn't re-fetch. Don't over-engineer this; a `useRef` cache inside the hook module scope is enough.

## Task 3 — Render the benchmark line

Edit `components/litters/PuppyGrowthChart.tsx` (currently 204 lines — stay under 300 after changes; if it would exceed 300, extract the benchmark-line rendering into a new small component `components/litters/GrowthBenchmarkLine.tsx`):

- Accept a new optional prop `benchmarkCurve?: { ageDays: number; avgGrams: number }[]`.
- Render it as a **dashed, muted background line** (e.g. `stroke="rgba(196,163,90,0.35)"`, `strokeDasharray="6 3"`, drawn *before* the puppy lines so it sits behind them) using the existing `xForDate`/`yForGrams` coordinate helpers — note the benchmark curve is keyed by `ageDays` not `recorded_date`, so you'll need an `ageDays`-to-`x` mapping using `whelpDate` + `uniqueDates`, not the existing `xForDate(date)` directly. Add a small label near the line ("Litter-size average") so it's clear this isn't a puppy.
- Add a legend swatch (dashed gold line + "Benchmark" label) alongside the existing per-puppy legend chips.

## Task 4 — Wire it into the litter weights tab

Edit `components/litters/LitterWeightsTab.tsx`:
- Call `useGrowthBenchmark(litter.puppy_count)`.
- Pass `benchmarkCurve` down to `PuppyGrowthChart`.
- Handle `loading`/`error` from the benchmark hook gracefully — if it fails or is still loading, just render the chart without the benchmark line (don't block the whole tab on it).

## Task 5 — Single-dog view (optional but recommended)

In `DogWeightPanel.tsx` / `DogHealthWeightSection.tsx`: same idea, but simpler — just show the single puppy's line against the same benchmark curve for its own litter's size bucket (reuse `useGrowthBenchmark` with that dog's `litter.puppy_count`). If this pushes any file over 300 lines, extract the benchmark line into the shared `GrowthBenchmarkLine.tsx` from Task 3 and reuse it here too.

---

## Critical warnings

- Do NOT touch RLS policies on `weight_logs` — already correct (admins manage, trainers view).
- Do NOT re-fetch all 1,234 weight rows on every render — memoize and cache per bucket as described.
- Do NOT hardcode litter-size bucket edges without checking the real distribution first — query `select puppy_count, count(*) from litters group by 1 order by 1;` and pick sensible bucket edges from what you see, then note in your summary what edges you used and why.
- Keep every touched/new file under 300 lines. Split further if needed.

## Testing checklist

- [ ] Open a litter with weight data → benchmark line renders behind puppy lines, doesn't obscure them
- [ ] A small litter (e.g. 5 puppies) and a large litter (e.g. 15 puppies) show visibly different benchmark curves
- [ ] A litter with no historical comparison data in its bucket shows the chart without a benchmark line, no crash
- [ ] Single-dog weight view also shows the benchmark line
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
