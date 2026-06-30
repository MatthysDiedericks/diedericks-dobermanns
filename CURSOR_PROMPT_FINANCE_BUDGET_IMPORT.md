# CURSOR PROMPT — Finance: Budget Module, Recurring Expenses, Excel Import & Dashboard Fixes

## Context

**Project:** Diedericks Dobermanns — React Native / Expo  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind, Zustand  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`  
**Currency:** South African Rand (ZAR) — always formatted as `R 0,00`

**Existing finance files:**
- `app/(admin)/finance/index.tsx` — Finance dashboard (main screen)
- `app/(admin)/finance/expenses/new.tsx` — Log expense form (has `is_recurring`, `receipt_url`, `MediaUploader`)
- `app/(admin)/finance/expenses/index.tsx` — Expense list
- `app/(admin)/finance/invoices/new.tsx` — Create invoice
- `app/(admin)/finance/invoices/index.tsx` — Invoice list
- `app/(admin)/finance/reports/index.tsx` — Reports screen
- `app/(admin)/finance/_layout.tsx` — Finance layout
- `hooks/useFinanceReport.ts` — Main finance data hook
- `hooks/useExpenses.ts` — Expense fetching + `createExpense`
- `hooks/useInvoices.ts` — Invoice fetching
- `lib/finance/queries.ts` — All DB queries (`fetchExpensesInRange`, `fetchInvoicesInRange`, etc.)
- `lib/finance/formatters.ts` — `formatAmount`, `formatDate`, `formatDelta`
- `lib/finance/generateExcel.ts` — `exportFinanceExcel(reportData)` already exists
- `lib/finance/generatePDF.ts` — PDF export already exists
- `lib/finance/mutations.ts` — Insert/update helpers
- `types/finance.ts` — All finance TypeScript types

**Existing DB tables (already live):**
- `invoices` — full invoice records
- `invoice_items` — line items per invoice
- `invoice_payments` — payment records
- `expenses` — expense records with `is_recurring`, `recurring_interval`, `recurring_end_date`, `receipt_url`
- `expense_categories` — categories with colour coding

---

## What to build — 7 tasks

### Task 1 — Fix year selector on Finance dashboard

**File:** `app/(admin)/finance/index.tsx`

**Problem:** Year selector currently only shows `[selectedYear - 1, selectedYear]` — always just 2 years relative to today. User needs to navigate across multiple years of historical data.

**Fix:**

```tsx
// Replace the dynamic year array with a fixed range: 2022 → current year + 2
const YEARS = Array.from(
  { length: new Date().getFullYear() - 2022 + 3 },
  (_, i) => 2022 + i
);

// In the JSX, replace the existing year ScrollView:
<ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
  {YEARS.map((y) => (
    <Pressable
      key={y}
      onPress={() => setSelectedYear(y)}
      className={`mr-2 rounded-full border px-4 py-2 ${
        y === selectedYear ? 'border-gold bg-gold/15' : 'border-gold/30'
      }`}
    >
      <Typography variant="label">{y}</Typography>
    </Pressable>
  ))}
</ScrollView>
```

This gives years 2022, 2023, 2024, 2025, 2026, 2027, 2028 — and auto-grows each year.

---

### Task 2 — Fix Finance dashboard chart (income AND expenses, not just income)

**File:** `app/(admin)/finance/index.tsx`

**Problem:** The `BarChart` currently only shows income. It should show income vs expenses as side-by-side bars for each month.

`react-native-chart-kit` BarChart does not support grouped bars natively. Use two separate `LineChart` overlays or switch to a **grouped bar implementation using two dataset colours**.

The cleanest fix with `react-native-chart-kit` is to use two datasets with the `datasets` array and different colours:

```tsx
// In monthlySummary, ensure expenses are included per month:
// MonthlySummary should be: { month: string; income: number; expenses: number }
// (update buildMonthlySummary in lib/finance/queries.ts to also sum expenses per month)

// Chart:
<BarChart
  data={{
    labels: monthlySummary.map((m) => m.month.slice(0, 3)),
    datasets: [
      {
        data: monthlySummary.map((m) => m.income || 0),
        color: () => Colors.gold,
      },
      {
        data: monthlySummary.map((m) => m.expenses || 0),
        color: () => '#EF4444',
      },
    ],
    legend: ['Income', 'Expenses'],
  }}
  width={chartWidth}
  height={220}
  yAxisLabel="R "
  yAxisSuffix=""
  chartConfig={{
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => `rgba(196, 163, 90, ${opacity})`,
    labelColor: () => Colors.silver,
    barPercentage: 0.5,
    decimalPlaces: 0,
  }}
  style={{ borderRadius: 8 }}
  fromZero
  showValuesOnTopOfBars={false}
/>
```

Also update `buildMonthlySummary` in `lib/finance/queries.ts` to join both invoice payments (income) and expenses in the same month loop so both datasets are populated.

---

### Task 3 — Fix invoice receipt/document upload (expenses)

**File:** `app/(admin)/finance/expenses/new.tsx`

**Problem:** User reports the receipt upload is present in the UI but not working. The `MediaUploader` component saves to `dog_media` storage path by default, which is wrong for financial receipts.

**Fix:**

1. The `createExpense` function in `hooks/useExpenses.ts` accepts `receipt_url`. Confirm the upload bucket and path.

2. The receipt should upload to Supabase Storage bucket `receipts` (or `documents` if that's the shared bucket), path: `receipts/{userId}/{expenseDate}/{filename}`.

3. Update the `MediaUploader` usage in `new.tsx` to pass the correct storage path:

```tsx
// In new.tsx, replace MediaUploader with explicit upload logic:
// Use expo-document-picker to select PDF or image
// Upload to 'documents' bucket at path: `expenses/{year}/{month}/{uuid}.{ext}`
// Store the returned public URL in receipt_url

import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';

const pickAndUploadReceipt = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
  });
  if (result.canceled || !result.assets?.[0]) return;
  const file = result.assets[0];
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `expenses/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, blob, { contentType: file.mimeType ?? 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  setReceiptUrl(data.publicUrl);
};
```

4. Add a `receiptUrl` state string and display a thumbnail or filename after upload.
5. Pass `receipt_url: receiptUrl` when calling `createExpense`.

> **Important:** Check that the `documents` bucket in Supabase Storage has an INSERT policy for `authenticated` users. If not, also run:
> ```sql
> CREATE POLICY "Authenticated users can upload to documents"
>   ON storage.objects FOR INSERT
>   WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
> ```

---

### Task 4 — Budget module (migration + screens)

#### 4a — Migration 0023: budgets table

**File to create:** `supabase/migrations/0023_budgets.sql`

```sql
-- 0023 — Annual and monthly budget targets per expense category

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int CHECK (month BETWEEN 1 AND 12),  -- NULL = annual budget
  category_id uuid REFERENCES expense_categories(id) ON DELETE CASCADE,
  label text,           -- Free-text label if not linked to a category (e.g. "Total Revenue Target")
  budget_type text NOT NULL DEFAULT 'expense'
    CHECK (budget_type IN ('expense', 'income', 'total')),
  budgeted_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique
  ON budgets(year, COALESCE(month, 0), COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), budget_type);

CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(year);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage budgets"
  ON budgets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Trainers can read budgets"
  ON budgets FOR SELECT USING (is_trainer_or_above());
```

> **Apply this migration via Supabase MCP or SQL editor before Cursor runs.**

#### 4b — Hook: `hooks/useBudgets.ts`

```typescript
// Fetches and upserts budget rows for a given year.
// Returns budgetsByCategory: Map<categoryId | 'income_total' | 'expense_total', BudgetRow[]>
export function useBudgets(year: number) {
  // fetch all budgets for the year
  // upsertBudget(input: UpsertBudgetInput): Promise<void>
  // deleteAllForYear(year): Promise<void>
  // annualTotal(budget_type): number  ← sum budgeted_amount where month IS NULL
  // monthlyBreakdown(category_id, budget_type): BudgetRow[]  ← all 12 months
}
```

#### 4c — New screen: `app/(admin)/finance/budget.tsx`

**Layout:**

```
┌──────────────────────────────────────────────┐
│ ← BUDGET                                     │
│ ─────────────────────────────────────────────│
│  [2025] [2026] [2027]     [Edit Budget]      │
│                                              │
│  ANNUAL TARGETS                              │
│  Total income target    R 450,000            │
│  Total expense budget   R 280,000            │
│  Target net profit      R 170,000            │
│                                              │
│  EXPENSES BY CATEGORY           Budget  Actual│
│  ┌──────────────────────────────────────────┐│
│  │ 🟡 Feed & Nutrition     R 5,000  R 3,200 ││
│  │     ████████░░░░  64%                    ││
│  │ 🔴 Veterinary           R 8,000  R 9,100 ││  ← over budget → red bar
│  │     ████████████ 114%                    ││
│  └──────────────────────────────────────────┘│
│                                              │
│  INCOME TRACKER                              │
│  Target: R 450,000   Actual: R 128,500       │
│  ████████░░░░░░░░░░  28.6%                  │
└──────────────────────────────────────────────┘
```

**Implementation rules:**
- Year selector at top (same YEARS range as dashboard fix)
- Two sections: "Income Targets" and "Expense Categories"
- Each category row shows: category name (with colour dot), budgeted amount, actual YTD, progress bar, percentage
- Progress bar colour: green < 75%, gold 75–99%, red ≥ 100%
- "Edit Budget" button opens a bottom sheet (`EditBudgetSheet`) for entering/editing budgeted amounts
- `EditBudgetSheet` shows a row per expense category with `Input` fields for monthly and annual amounts
- When editing: entering an annual total auto-divides into 12 equal months (user can override individual months)
- Save calls `upsertBudget` for each row
- Monthly toggle: tabs for "Annual" and "Jan–Dec" let user view budget vs actual month by month

**File:** `app/(admin)/finance/budget.tsx` (under 280 lines — extract `EditBudgetSheet` to `components/finance/EditBudgetSheet.tsx`)

#### 4d — Link Budget from Finance dashboard

In `app/(admin)/finance/index.tsx`, add a **Budget** button to the floating action row and a **Budget summary card** in the dashboard:

```tsx
// Add at top of KPI cards, before invoice list:
<Pressable onPress={() => router.push('/(admin)/finance/budget' as never)}>
  <Card className="mb-4 mx-6 flex-row items-center justify-between">
    <View>
      <Typography variant="label" className="text-gold">Budget Tracker</Typography>
      <Typography variant="caption" className="text-subtle">
        {year} · Expenses {budgetUsedPct.toFixed(0)}% of budget
      </Typography>
    </View>
    <Typography variant="label" className="text-gold">→</Typography>
  </Card>
</Pressable>
```

The `budgetUsedPct` comes from a lightweight `useBudgetSummary(year)` hook that fetches total budgeted expenses and compares to `totalExpenses` from `useFinanceReport`.

---

### Task 5 — Recurring expenses screen + management

**File:** `app/(admin)/finance/expenses/recurring.tsx`

**Purpose:** View and manage all expenses marked `is_recurring = true`. Shows what recurs, at what interval, next due date, and monthly/annual cost.

**Layout:**

```
┌──────────────────────────────────────────────┐
│ ← RECURRING EXPENSES                         │
│ ─────────────────────────────────────────────│
│  Monthly cost: R 12,400    Annual: R 148,800 │
│                                              │
│  MONTHLY (7)                                 │
│  ┌──────────────────────────────────────────┐│
│  │ Feed — Premium Puppy    R 3,200 /month   ││
│  │ Next due: 1 Jul 2026  [Edit] [Remove]   ││
│  └──────────────────────────────────────────┘│
│  QUARTERLY (2)                               │
│  ANNUAL (1)                                  │
│                                              │
│  [+ Add Recurring Expense]                   │
└──────────────────────────────────────────────┘
```

**Implementation:**
- `useRecurringExpenses()` hook — `fetchAllExpenses()` filtered to `is_recurring = true`, grouped by `recurring_interval`
- Summary row at top: total monthly equivalent cost + annualised (quarterly × 4, annual × 1)
- Grouped sections: Monthly / Quarterly / Annual
- Each card: description, category colour dot, amount + interval, supplier, next due date (calculate from `expense_date` + `recurring_interval`)
- "Edit" navigates to expense edit screen
- "Remove recurring" sets `is_recurring = false` and clears interval (does NOT delete the expense)
- "Add Recurring Expense" routes to `expenses/new` with `isRecurring` pre-set to `true`

**Link from Finance dashboard:**  
Add a "Recurring Expenses" button in the action buttons area of `finance/index.tsx`.

---

### Task 6 — Excel bulk import screen

**File:** `app/(admin)/finance/import.tsx`

**Purpose:** Import expenses (or invoices) from an Excel file exported from another platform (e.g., Sage, QuickBooks, bank statement export, manual spreadsheet).

**Expected column format (document in the UI):**
| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| Date | Description | Amount | Category | Supplier | Notes |

Date: `YYYY-MM-DD` or `DD/MM/YYYY` (auto-detect both)  
Amount: numeric (positive = expense, negative = ignored or treated as income refund)  
Category: text — matched to `expense_categories.name` (case-insensitive, partial match ok; unmatched = "Other")

**Implementation:**

```tsx
// Uses:
// - expo-document-picker to pick .xlsx or .xls file
// - SheetJS (xlsx) — already in package.json — to parse the file
// - Preview table before committing import
// - Bulk insert via createExpense calls (or direct Supabase insert for performance)

import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';

async function pickAndParseExcel() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'application/vnd.ms-excel'],
  });
  if (result.canceled) return;
  const file = result.assets[0];
  // Read file as base64, parse with XLSX
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(base64, { type: 'base64' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as unknown[][];
  // Skip header row, map to ImportRow[]
  return rows.slice(1).map(parseRow);
}
```

**Screen layout:**

```
┌──────────────────────────────────────────────┐
│ ← IMPORT FROM EXCEL                          │
│ ─────────────────────────────────────────────│
│  Step 1: Download template                   │
│  [⬇ Download template.xlsx]                  │
│                                              │
│  Step 2: Pick your Excel file                │
│  [📂 Choose File]   no file selected         │
│                                              │
│  ── PREVIEW (23 rows) ──────────────────────│
│  Date        Description      Amount  Cat.  │
│  2026-01-05  Feed - Premium   R 3,200  Feed │
│  2026-01-12  Vet consultation R 850    Vet  │
│  ...                                        │
│                                             │
│  ⚠ 2 rows could not be matched             │
│  [View errors]                              │
│                                             │
│  [Cancel]    [Import 21 rows →]             │
└──────────────────────────────────────────────┘
```

**Implementation steps:**

1. **Download template button**: Generate a minimal XLSX template using SheetJS with the required headers and 2 example rows, then share it using `expo-sharing`.

2. **Pick file**: `DocumentPicker.getDocumentAsync` → parse with XLSX → produce `ImportRow[]`

3. **Preview**: `FlatList` of parsed rows. Each row shows date, description, amount, matched category. Unmatched categories highlighted in orange.

4. **Error panel**: Rows with invalid date or non-numeric amount shown in a collapsible error section.

5. **Import**: Batch insert valid rows into `expenses` table. Show progress indicator. On completion: "✓ 21 expenses imported" toast + navigate back to expense list.

**TypeScript types:**
```typescript
interface ImportRow {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;
  rawCategory: string;   // from Excel
  categoryId: string | null;  // matched or null
  categoryName: string;
  supplier: string | null;
  notes: string | null;
  valid: boolean;
  error?: string;
}
```

**File:** `app/(admin)/finance/import.tsx` (under 280 lines — extract `ImportPreviewRow` to `components/finance/ImportPreviewRow.tsx`)

**Link from Finance dashboard:** Add "Import" button (upload icon) to the floating action area in `finance/index.tsx`.

---

### Task 7 — Bookkeeper export button on dashboard

The `exportFinanceExcel` function already exists in `lib/finance/generateExcel.ts` but isn't surfaced in the dashboard UI.

**In `app/(admin)/finance/index.tsx`**, add an Export button that:
1. Calls `loadReport()` from `useFinanceReport` to get `FinanceReportData`
2. Calls `exportFinanceExcel(reportData)` which uses `expo-sharing` to share the file
3. Shows a loading spinner while generating

```tsx
// Add to existing floating actions row:
<Pressable
  onPress={handleExport}
  className="rounded-full border border-gold/40 bg-surface px-5 py-3"
>
  {exporting ? (
    <ActivityIndicator size="small" color={Colors.gold} />
  ) : (
    <Typography variant="label">Export</Typography>
  )}
</Pressable>
```

Also add a **PDF export** button that calls `exportFinancePDF` from `lib/finance/generatePDF.ts`.

---

## File summary

| Action | File |
|--------|------|
| CREATE (migration) | `supabase/migrations/0023_budgets.sql` |
| CREATE (hook) | `hooks/useBudgets.ts` |
| CREATE (hook) | `hooks/useRecurringExpenses.ts` |
| CREATE (hook) | `hooks/useBudgetSummary.ts` |
| CREATE (screen) | `app/(admin)/finance/budget.tsx` |
| CREATE (screen) | `app/(admin)/finance/import.tsx` |
| CREATE (screen) | `app/(admin)/finance/expenses/recurring.tsx` |
| CREATE (component) | `components/finance/EditBudgetSheet.tsx` |
| CREATE (component) | `components/finance/BudgetCategoryRow.tsx` |
| CREATE (component) | `components/finance/ImportPreviewRow.tsx` |
| EDIT | `app/(admin)/finance/index.tsx` — year range, chart fix, budget card, export buttons, import + recurring links |
| EDIT | `app/(admin)/finance/expenses/new.tsx` — fix receipt upload |
| EDIT | `lib/finance/queries.ts` — update `buildMonthlySummary` to include expenses per month |
| EDIT | `app/(admin)/finance/_layout.tsx` — add routes for budget, import, recurring |

---

## Execution order

1. Apply `0023_budgets.sql` migration (via Supabase MCP — run this before anything else)
2. Edit `lib/finance/queries.ts` → fix `buildMonthlySummary` to return both income + expenses
3. Create `hooks/useBudgets.ts`, `hooks/useRecurringExpenses.ts`, `hooks/useBudgetSummary.ts`
4. Create `components/finance/EditBudgetSheet.tsx`, `BudgetCategoryRow.tsx`, `ImportPreviewRow.tsx`
5. Create `app/(admin)/finance/budget.tsx`
6. Create `app/(admin)/finance/expenses/recurring.tsx`
7. Create `app/(admin)/finance/import.tsx`
8. Edit `app/(admin)/finance/index.tsx` (all fixes)
9. Edit `app/(admin)/finance/expenses/new.tsx` (receipt upload fix)
10. Edit `app/(admin)/finance/_layout.tsx`

---

## Critical rules

- **NEVER** put `SUPABASE_SERVICE_ROLE_KEY` in any client-side variable
- Every file must stay under 300 lines
- No TypeScript errors — run `npx tsc --noEmit` and fix all errors before finishing
- All `useEffect` hooks must have correct dependency arrays
- SheetJS (`xlsx`) is already installed — do NOT add it again
- `expo-document-picker` and `expo-file-system/legacy` are already installed — do NOT add new packages
- `expo-sharing` is already installed for file export
- The `documents` Supabase Storage bucket already exists — use it for receipt uploads with path `expenses/{year}/{month}/{uuid}.ext`
- Budget progress bars must be pure `View` with width calculated as a percentage (do NOT use third-party progress bar libs)
- The import screen must handle BOTH `YYYY-MM-DD` and `DD/MM/YYYY` date formats from Excel
- Unmatched categories must fall back to the first available `expense_categories` row named "Other" or "Uncategorised" — never fail silently

---

## Testing checklist

- [ ] Year selector now shows 2022 through current year + 2
- [ ] Finance chart shows both income (gold) and expenses (red) per month
- [ ] Expense receipt upload: pick a PDF → uploads to `documents` bucket → URL saved in `expenses.receipt_url`
- [ ] Budget screen loads for selected year — categories listed with budgeted and actual amounts
- [ ] Budget progress bars: green under 75%, gold 75–99%, red at or over 100%
- [ ] Edit Budget sheet: enter annual amount → auto-divides into months → save stores rows in `budgets` table
- [ ] Recurring Expenses screen: lists all `is_recurring = true` expenses grouped by interval
- [ ] Recurring summary shows correct monthly cost total and annualised figure
- [ ] Excel import: download template works, pick file parses rows correctly, preview table shows before import
- [ ] Import matches Excel category names to DB categories (case-insensitive)
- [ ] Invalid rows shown in error panel, NOT imported
- [ ] Bulk import completes with success toast
- [ ] Export button generates and shares Excel file via `expo-sharing`
- [ ] Budget summary card visible on Finance dashboard with correct usage percentage
- [ ] All screens load without TypeScript errors
- [ ] All files under 300 lines
