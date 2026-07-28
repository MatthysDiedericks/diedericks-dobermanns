# Cursor Prompt — Query & List Performance Cleanup

## Context
Diedericks Dobermanns app. Performance audit (2026-07-22) found two code-side issues. Database-side fixes (90 FK indexes, RLS initplan rewrite) are ALREADY DONE — do not touch the database or any RLS.

## Task 1 — Replace all `select('*')` with explicit column lists
14 occurrences across `hooks/` and `lib/` (grep `select('*')` and `select("*")`). For each: look at what the consuming code actually uses and select only those columns. If a query genuinely needs nearly all columns (e.g. a detail screen), selecting all named columns explicitly is fine — the point is type safety and no accidental payload growth. Do NOT change query logic, filters, or ordering.

## Task 2 — FlatList for the big lists only
Convert `.map()` JSX rendering to `FlatList` (with `keyExtractor`, sensible `initialNumToRender`) ONLY in screens whose datasets grow unboundedly:
- Dogs lists (admin + public + kennel)
- Litters index
- Expenses list
- Waiting list (if any stage column renders large arrays via map)
- Contacts CRM list
- Documents lists

Leave small fixed lists (tab bars, status pickers, forms, dashboards with capped counts) as `.map()` — converting those is churn with no benefit. If a screen already uses FlatList, skip it. Watch out: FlatList inside a ScrollView is an anti-pattern — where a screen wraps content in ScrollView, either make the FlatList the screen's scroller (header/footer via ListHeaderComponent) or leave it if the list is capped.

## Warnings
- Zero visual changes — same cards, same order, same empty states.
- No file over 300 lines. `npx tsc --noEmit` must pass.
- Test pull-to-refresh still works on every converted screen.

## Testing checklist
- [ ] grep shows zero remaining `select('*')` in hooks/ and lib/
- [ ] Converted screens scroll smoothly and pull-to-refresh works
- [ ] No screen renders blank that previously showed data
