# PARITY PROMPT 1 — Finance on the website

Mirror the app's finance screens onto the website admin. See `WEBSITE_PARITY_PLAN.md`
for the full context: the app has 68 admin screens, the website 33, and this closes the
first four.

**Repo:** `diedericksdobermann-web` (Next.js 15 App Router, TypeScript strict, Tailwind v4)
**Supabase:** `nlmwxodvquwbjinhhbmr`
**Brand:** bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`, Cinzel headings.

## Read first — mirror these, do not reinvent

Source of truth for behaviour is the app. Read before writing:

- `diedericks-dobermanns/app/(admin)/finance/budget.tsx`
- `diedericks-dobermanns/app/(admin)/finance/creditors.tsx`
- `diedericks-dobermanns/app/(admin)/finance/expenses/recurring.tsx`
- `diedericks-dobermanns/app/(admin)/finance/import.tsx`

Existing website patterns to reuse — do not invent new ones:

- `src/app/admin/(panel)/finance/page.tsx`, `finance/expenses/`, `finance/invoices/`, `finance/reports/`
- `src/components/admin/CollapsibleCard.tsx`, `AdminHeader.tsx`
- `src/lib/admin/styles.ts` (`inputClass`), `src/lib/finance/formatters.ts` (`formatAmount`)

## Tables — already exist, do not create

```
budgets(id, year int, month int, category_id, label, budget_type, budgeted_amount numeric,
        notes, created_at, updated_at, created_by)

budget_line_items(id, category_id, year int, month int, name, amount numeric,
                  sort_order int, notes, created_at, updated_at, created_by)
```

Creditors and recurring expenses are held in the existing `expenses` table — read the app
screens to see which columns flag them. Do **not** add tables without checking first.

## Screens to build

### 1. `src/app/admin/(panel)/finance/budget/page.tsx`

Budget by year and month. A year selector, then per-category budgeted vs actual with the
variance. Actuals come from `expenses` for the same period — match on `category_id`, year,
month. Show over-budget in red, under in muted, and a total row.

Line items (`budget_line_items`) expand under each category: add, edit, delete inline, with
a monthly-recurring vs one-off distinction as the app has it.

### 2. `src/app/admin/(panel)/finance/creditors/page.tsx`

Outstanding amounts owed to suppliers, grouped by creditor, oldest first, with a total.

### 3. `src/app/admin/(panel)/finance/expenses/recurring/page.tsx`

Recurring expense definitions: list, create, edit, deactivate. Show next due date and
monthly total.

### 4. `src/app/admin/(panel)/finance/import/page.tsx`

CSV/Excel import for expenses, mirroring the app's importer: upload → parse → preview
mapped rows with validation errors highlighted → confirm → insert. **Nothing writes until
the user confirms the preview.** Reuse the existing dedup logic (`expenses.source`
distinguishes manual / historical_import / csv_import).

## Wiring

- Add all four to `src/components/layout/AdminSidebar.tsx` under Finance.
- Add them to the finance landing page as cards.
- Server actions in a co-located `actions.ts` per route.

## Rules

- Every server action calls `requireAdmin()` and returns `{ error }` rather than throwing.
- Every Supabase call checks `error` and surfaces it in the UI. A swallowed error is what
  hid the gallery category bug for weeks.
- Money: `numeric` in the DB. Never use floats for arithmetic — format with `formatAmount`.
- No file over 300 lines. Split into components before you reach it.
- Loading, empty and populated states on every list.
- Do **not** use `createAdminClient()` — this is an admin route with a real session; RLS
  plus `requireAdmin()` is the correct guard.

## Verify

- [ ] Budget totals match the app for the same month.
- [ ] Import preview shows validation errors and writes nothing until confirmed.
- [ ] Re-importing the same file creates no duplicates.
- [ ] `npx tsc --noEmit` exits 0 and `npx next build` succeeds.
- [ ] No file over 300 lines.

## Commit

From `diedericksdobermann-web/`. `git add -A`, one commit. Confirm
`git ls-files --others --exclude-standard src/` is empty first — untracked files shipping
beside their importer has broken every previous build here.
