# Cursor Prompt — Dashboard: All Litters by Year (Collapsible)

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**Already built — do not rebuild:**
- `components/dashboard/AdminDashboardContent.tsx` — the admin dashboard. Its "Current Litters" widget (line ~95) is a `SurfaceCard` listing `data.currentLitters`, each row navigating to `/(admin)/litters/[id]`.
- `lib/kennel/queries.ts`'s `fetchCurrentLitters()` — filters `litters.status in ('born','available')` only. This is why the dashboard only ever shows in-progress litters — once a litter's puppies are all placed and its status moves on, it disappears from the dashboard entirely, with no way to browse past years from there. That's the actual gap Matt flagged.
- `components/admin/SurfaceCard.tsx` — reusable card with an optional `href` (tappable title, chevron icon) — reuse this, don't build a new card component.
- `app/(admin)/litters/index.tsx` already exists as the full litters list screen — check it before assuming this dashboard widget needs to duplicate its filtering/search capability. This prompt is about the **dashboard widget**, not rebuilding the litters list screen.
- The now-24-litters/155-puppies dataset imported today spans **2019–2026** — this is real, substantial historical breadth the dashboard currently has no way to show.

**What's missing:** a way, from the dashboard, to either collapse the "Current Litters" card down (Matt's "collapse option") or switch it to a year view showing every litter from a selected year — not just the 2–3 currently in progress.

---

## Task 1 — New query: litters by year

Add to `lib/kennel/queries.ts` (keep the file under 300 lines — extract to a new `lib/kennel/littersByYear.ts` if adding this would push it over):

```ts
export async function fetchLittersByYear(year: number): Promise<CurrentLitterRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select(
      'id, actual_date, go_home_date, go_home_weeks, male_count, female_count, litter_letter, mother_id, father_id, status, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name)',
    )
    .gte('actual_date', `${year}-01-01`)
    .lte('actual_date', `${year}-12-31`)
    .order('actual_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CurrentLitterRow[];
}

export async function fetchLitterYears(): Promise<number[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('litters').select('actual_date').not('actual_date', 'is', null);
  if (error) throw new Error(error.message);
  const years = new Set((data ?? []).map((r) => new Date(r.actual_date as string).getFullYear()));
  return [...years].sort((a, b) => b - a);
}
```

Note `fetchCurrentLitters()`'s existing select doesn't include `status` — add it here since the year view should show litters regardless of status (unlike the current-only widget), and the UI will want to show a status badge so it's clear which litters in a past year are done vs which (if any, for the current year) are still active.

## Task 2 — Dashboard widget: collapsed by default, year switcher when expanded

Edit `components/dashboard/AdminDashboardContent.tsx`'s "Current Litters" `SurfaceCard` (don't touch the other widgets):

- Add a small toggle in the card — e.g. a "This year ▾" chip next to the title — that expands into a horizontal year scroller (reuse the exact pattern already used in `app/(admin)/finance/index.tsx` for its year pills: `YEARS.map(...)` with `border-gold bg-gold/15` active state — match that styling, don't invent a new pill style).
- Default state: collapsed, showing the existing `data.currentLitters` (unchanged behavior — don't regress what already works).
- When a year is selected: call `fetchLittersByYear(year)` (new local state + loading flag in this component, following the existing `useState`/loading pattern already in this file — no new hook needed for something this scoped, but if the fetch logic grows past ~20 lines inline, extract a small `useLittersByYear(year)` hook instead of inlining it).
- Show a status badge per row when in year-view mode (since past-year litters won't all be `status='born'`) — reuse whatever badge component the litters list screen (`app/(admin)/litters/index.tsx`) already uses for status, don't invent a new one.
- "Collapse" affordance: tapping the year chip again (or a explicit "Show current only" action) returns to the default `data.currentLitters` view.

## Task 3 — Year list source

Use `fetchLitterYears()` from Task 1 to populate the year chips (don't hardcode a year range — the earliest litter is 2019, per today's import, and this should keep working automatically as older/newer litters are added).

---

## Critical warnings

- Do not change `fetchCurrentLitters()` or the default dashboard behavior — this is additive (an expand/collapse state), not a replacement.
- Do not duplicate the year-pill UI pattern — copy the exact styling already used in `app/(admin)/finance/index.tsx` so the app stays visually consistent.
- Keep `AdminDashboardContent.tsx` under 300 lines — if this widget's logic pushes it over, extract a new `components/dashboard/LittersByYearWidget.tsx`.

## Testing checklist

- [ ] Dashboard loads with current behavior unchanged (collapsed, current litters only)
- [ ] Selecting a past year (e.g. 2022) shows that year's litters with status badges, including litters whose status has since moved past 'born'/'available'
- [ ] Year list includes every year that actually has a litter, oldest first isn't assumed — sorted newest-first
- [ ] Collapsing returns to the current-litters default
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
