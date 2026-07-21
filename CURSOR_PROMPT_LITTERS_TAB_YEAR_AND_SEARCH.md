# Cursor Prompt — Litters Tab: Year Selector + Dog Search (Microchip/Name)

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**Already built — do not rebuild:**
- `app/(admin)/litters/index.tsx` — the Litters tab. Has an "ALL LITTERS" / "BY FEMALE" toggle. "ALL LITTERS" shows every litter split into an unlabeled "active" group at the top and a "COMPLETED" group below, via `hooks/useLittersIndex.ts`'s `isActiveLitter()`.
- **Real bug found this session, relevant to why this feature matters now:** `isActiveLitter()` checks `status in ('whelped','born','nursing','active')`, but every one of the 24 litters imported today (spanning 2019–2026) was inserted with `status = 'born'` (the DB's `litters_status_check` constraint only allows `planned/expected/born/placed` — there's no distinct "done" status). So **all 24 litters, including ones from 2019, currently show under "active"** with nothing in "COMPLETED" — the screen is one long undifferentiated list. Fix this as part of Task 1 by also giving Cursor room to either (a) add a "placed" status pass for litters where every puppy's own status is sold/placed/deceased (a computed completion check, not a manual field), or (b) simply stop relying on `isActiveLitter` to group historical litters at all once a year filter exists — the year filter genuinely solves the underlying "how do I not see 2019 litters by default" problem, so don't over-engineer the status-completion logic if the year filter alone resolves the immediate need. Use judgement, but note the discrepancy either way.
- `hooks/useLittersIndex.ts` — `useLittersIndex()` fetches everything unfiltered, `useFemaleLitterHistory()` for the by-female view.
- Search input pattern already established in `app/(admin)/documents/index.tsx`: a plain `Input` bound to `useState`, filtered client-side via `useMemo` — copy this pattern exactly, don't invent a new search UI style.
- Year-pill styling already established in `app/(admin)/finance/index.tsx` (`YEARS.map(...)`, `border-gold bg-gold/15` active state) — reuse this exact style for consistency across the app, and reuse it again here rather than building a third variant (the dashboard litters-by-year prompt from earlier today also uses this same pattern — keep all three consistent).
- `components/litters/PuppyGrowthChart.tsx` — `CHART_HEIGHT` already bumped from 220 to 300 directly (not by Cursor) earlier today. No further sizing work needed here unless it still looks small on a real device — if so, adjust `CHART_HEIGHT` further (currently 300) rather than touching `width` (the SVG is `width="100%"`, so only `CHART_HEIGHT` controls the actual on-screen size).

---

## Task 1 — Year selector on the Litters tab

Edit `app/(admin)/litters/index.tsx`:
- In the "ALL LITTERS" view (not "BY FEMALE" — leave that view alone), add a horizontal year-pill row above the list, styled exactly like `app/(admin)/finance/index.tsx`'s year pills. Include an "All" pill as the default/first option.
- Populate the year list from the actual litter dates present (reuse or adapt `fetchLitterYears()` if it was already added to `lib/kennel/queries.ts` by the earlier dashboard-litters-by-year prompt today — check before writing a duplicate; if that prompt hasn't been run yet, add it here instead and note it so the dashboard prompt can reuse it rather than creating its own copy).
- Selecting a year filters `active`/`completed` (or whatever grouping Task 1's context note above lands on) down to litters whose `actual_date` falls in that year — this can be done client-side via `useMemo` over the already-fetched `litters` array from `useLittersIndex()`, no new query needed (the full list is already fetched, unlike the dashboard widget which intentionally avoids fetching everything for its compact card).

## Task 2 — Dog search by microchip or name

Add a search `Input` (copy the exact pattern from `app/(admin)/documents/index.tsx`) at the top of the Litters tab, above the year pills:
- Placeholder: "Search by name or microchip number…"
- Filters the visible litters/puppies to only those containing a matching puppy — check `dogs.name` (case-insensitive partial match) and `dogs.microchip_number` (exact or partial match — microchip numbers are 15 digits, decide whether partial-suffix matching is more useful for a breeder typing the last few digits off a scanner, and note your choice).
- On a match, the matching puppy should be easy to spot — consider auto-expanding/highlighting the litter containing the match rather than just filtering litters out entirely, since a breeder searching by microchip usually wants to jump straight to that specific puppy's litter/detail screen, not just see which litters contain it. Tapping the matched puppy card should navigate to that dog's detail screen the same way `PuppyCard` already does elsewhere (check `components/litters/PuppyCard.tsx` for the existing navigation behavior and reuse it).
- `useLittersIndex()`'s existing select already includes each puppy's `name` — it does **not** currently include `microchip_number`. Add `microchip_number` to `LITTER_INDEX_SELECT` in `hooks/useLittersIndex.ts` (small, additive change — don't restructure the hook).

---

## Critical warnings

- Don't touch the "BY FEMALE" view — this prompt is additive to "ALL LITTERS" only.
- Don't refetch on every keystroke — the search is a client-side filter over already-loaded data (24 litters / 155 puppies is small enough that this is fine; no debounce or server round-trip needed).
- Check whether `fetchLitterYears()` already exists (from the dashboard-litters-by-year prompt) before adding a duplicate version.

## Testing checklist

- [ ] Year pills show only years that actually have a litter, default "All" shows everything as before
- [ ] Searching a puppy's full name finds it
- [ ] Searching a partial/last-few-digits of a microchip number finds the right puppy
- [ ] Tapping a search result navigates to the correct dog detail screen
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
