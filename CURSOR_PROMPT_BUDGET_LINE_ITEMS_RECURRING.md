# Cursor Prompt — Budget Line Items (Sub-Budgets), Recurring Toggle, Quick-Add Category/Item

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**Current state — do not rebuild:** `budgets` table (migration `0023_budgets.sql`) stores one flat `budgeted_amount` per `(year, month, category_id, budget_type)`. `app/(admin)/finance/budget.tsx` is the Budget screen; `components/finance/EditBudgetSheet.tsx` is the edit sheet — today it only accepts one "annual" number per category and auto-writes that number divided by 12 into all 12 monthly rows (see its `handleSave`). `lib/finance/budgetQueries.ts` has `budgetForCategoryMonth()`, which reads a monthly row if it exists, else falls back to `annual / 12`. `hooks/useBudgets.ts` wraps all of this. None of this is broken — keep the existing flat-number path working exactly as today for any category that doesn't opt into itemizing.

**What's missing — this prompt adds it:**
1. The ability to break a category (e.g. "Salaries") into named sub-items (e.g. individual staff members) with their own amounts, which roll up into the category total automatically.
2. A genuine "this amount is the same every month" concept for a line item, distinct from "annual total divided by 12." Today there is no way to say "R8,000/month, all year" without also implying it started accruing from January even if the person only joined in June — a one-off/monthly distinction is needed per item.
3. Inline "add a new expense category" and "add a new line item" — no leaving the budget screen.

**Deliberate scope decision:** line items are **admin-only** (not visible to `is_trainer_or_above()`), since individual staff salary amounts are more sensitive than a category total. Category-level totals remain visible to trainers exactly as today.

---

## Task 1 — Migration: `budget_line_items`

`supabase/migrations/00XX_budget_line_items.sql` (check `list_migrations` via the Supabase MCP for the real next number before naming — this project's local filenames and live-applied migrations have drifted before, most recently with `0040_waitlist_quote_invoice_link.sql`):

```sql
-- Sub-budget line items (e.g. individual staff under "Salaries"). A category with
-- no line items keeps using the existing flat `budgets.budgeted_amount` — this table
-- is purely additive/opt-in per category per year.
CREATE TABLE IF NOT EXISTS budget_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  year int NOT NULL,
  -- NULL = recurring: this amount applies unchanged to every month of `year`.
  -- Set to 1-12 = one-off: this amount applies only to that specific month
  -- (e.g. a December bonus), on top of any recurring items.
  month int CHECK (month BETWEEN 1 AND 12),
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_category_year
  ON budget_line_items(category_id, year);

ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

-- Admin-only, both read and write — deliberately stricter than the `budgets` table,
-- which trainers can read. Individual staff amounts are more sensitive than a
-- category total.
CREATE POLICY "Admins manage budget line items"
  ON budget_line_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());
```

## Task 2 — Query layer: compute category totals from line items when present

In `lib/finance/budgetQueries.ts`:

- Add `fetchBudgetLineItems(categoryId: string, year: number): Promise<BudgetLineItem[]>` and `fetchAllBudgetLineItemsForYear(year: number): Promise<BudgetLineItem[]>` (the latter for the main budget screen — one query for all categories, not one per category).
- Add `upsertBudgetLineItem(input)` and `deleteBudgetLineItem(id)`.
- Add a pure function `lineItemsTotalForMonth(items: BudgetLineItem[], categoryId: string, month: number | null): number`:
  - `month === null` (annual view): sum of all recurring items (`month IS NULL`) × 12, **plus** the sum of all one-off items regardless of which month they're in.
  - `month` set: sum of all recurring items for that category, **plus** the sum of one-off items where `item.month === month`.
- Modify `budgetForCategoryMonth()`: **if any line items exist for that category+year**, ignore the flat `budgets` row entirely and return `lineItemsTotalForMonth(...)` instead. If no line items exist, behave exactly as today (unchanged — this is the backward-compatibility guarantee).

Add the new types (`BudgetLineItem`, insert/update input types) to `types/finance.ts` alongside the existing `BudgetRow`/`UpsertBudgetInput`.

## Task 3 — Hook: `useBudgets` exposes line items

In `hooks/useBudgets.ts`:
- Fetch all line items for the year alongside the existing `fetchBudgetsForYear`/`fetchExpenseCategories`/`fetchExpensesInRange` calls (parallel, same `Promise.all`).
- Expose `lineItemsForCategory(categoryId: string): BudgetLineItem[]`, `isItemized(categoryId: string): boolean` (true if the category has ≥1 line item for the selected year), and mutation wrappers `saveLineItem`, `deleteLineItem` that call the query layer then `refresh()`.
- `categoryRows` and `budgetForCategoryMonth` already flow through `budgetForCategoryMonth()` from Task 2, so they automatically reflect itemized totals — no separate branch needed in the hook itself.

## Task 4 — UI: itemize a category in `EditBudgetSheet.tsx`

This is the main UI work. Keep the existing flat-annual-number input as the default for every category (unchanged UX for anyone who never itemizes anything). Add:

- A small "Itemize" / "Use total" toggle link next to each category's annual input. Tapping "Itemize" collapses the flat number input and expands a line-item list for that category instead (and vice versa — tapping "Use total" doesn't delete existing line items, it just switches the category back to flat-number mode for display; if the category still has line items, keep showing a read-only computed total instead of resurrecting the old flat input untouched, to avoid the two numbers silently disagreeing).
- When itemized, each row shows: name (text input), amount (numeric input), and a small segmented control — **"Every month"** vs **"One-off"**. Selecting "One-off" reveals a compact month picker (reuse whatever month-name list/component already exists — check `MONTHS` in `app/(admin)/finance/budget.tsx` and the pattern used elsewhere for month pickers before building a new one).
- A "+ Add item" row at the bottom of each itemized category's list. New items default to "Every month" (recurring) since that's the common case (a new staff member's salary).
- A running computed total per itemized category, shown read-only above the item list: "Annual: {sum} · This month ({current}): {sum}" — reuses `lineItemsTotalForMonth()` from Task 2, computed client-side from the current draft state (not re-fetched per keystroke).
- Each item row gets a delete (trash icon) button.
- On "Save budget": persist any changed/new line items via `saveLineItem`, and delete any removed ones via `deleteLineItem` — alongside the existing flat-category and income-target saves, which continue to work unchanged for non-itemized categories.

## Task 5 — UI: quick-add category and quick-add item

- **New category:** find the existing category creation logic (grep `expense_categories` insert — it should already exist somewhere in the Expenses module for adding categories there; reuse that function, don't write a second one). Add a "+ New Category" pressable at the bottom of `EditBudgetSheet`'s category list. Opens a minimal inline form (name + colour swatch picker, reusing whatever colour-picker pattern the Expenses category UI already uses). On save, insert the category and add it to the current sheet's draft list immediately (no need to close/reopen the sheet).
- **New item:** covered by Task 4's "+ Add item" row — just confirming it's the same "no modal, no navigation, inline in the list" pattern as the category add, for consistency.

## Task 6 — Budget screen display (`app/(admin)/finance/budget.tsx` + `BudgetCategoryRow.tsx`)

- `BudgetCategoryRow` should show a small "· 3 items" caption (item count) next to itemized categories, so it's visually obvious at a glance which categories are broken down vs flat. Tapping the row (or a small chevron) expands an inline read-only breakdown of the items and their amounts for the currently selected month/annual view — this is a display-only expansion, not editable here (editing happens in `EditBudgetSheet`, opened via the existing "Edit Budget" button).

---

## Critical warnings

- Do NOT change behavior for any category that has zero line items — the existing flat-annual-divided-by-12 path must keep working exactly as it does today. This is an additive, opt-in feature per category per year, not a replacement.
- Do NOT let "Itemize" silently discard an existing flat `budgets` row's value — if a category already has a flat annual number and the admin itemizes it, leave the old flat rows in the database (harmless, just unused once line items exist and take priority per Task 2) rather than deleting them, in case they switch back.
- Line items are **admin-only** — do not expose `budget_line_items` reads to trainers. Verify with a non-admin test user that the budget screen still loads correctly for trainers (category totals visible, no line-item detail, no errors).
- Confirm the real next migration number via the Supabase MCP before naming Task 1's file.
- No file over 300 lines — `EditBudgetSheet.tsx` is likely to grow the most from this; split the per-category itemized list into its own component (e.g. `components/finance/BudgetLineItemEditor.tsx`) if it starts crowding the sheet.

## Testing checklist

- [ ] A category with no line items behaves identically to today — flat annual input, divided by 12 per month
- [ ] Itemizing "Salaries" and adding 2-3 named staff with amounts produces the correct annual and per-month totals on the main Budget screen
- [ ] A recurring ("Every month") item of R5,000 shows R5,000 in every month view and R60,000 in annual view
- [ ] A one-off item of R10,000 in December shows R10,000 only in December, R0 in other months, and R10,000 in the annual total
- [ ] "+ New Category" creates a real `expense_categories` row and it's immediately usable in the same sheet without closing it
- [ ] "+ Add item" works inline, no navigation
- [ ] Deleting a line item updates the category total immediately
- [ ] A trainer (non-admin) test login sees category totals on the Budget screen but cannot see or fetch line-item detail
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
