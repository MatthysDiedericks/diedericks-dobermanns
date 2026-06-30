# CURSOR PROMPT — Expense Upgrade: VAT, Dog/Litter Allocation, Payment Accounts, Dashboard Wiring

## Context

**Project:** Diedericks Dobermanns — React Native / Expo  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`  
**VAT rate (South Africa):** 15%

### Live expenses table columns (verified via DB query — do not assume from old migrations):
```
id, category_id, description, amount, currency, expense_date,
dog_id, litter_id, is_recurring, recurrence_interval, recurrence_end_date,
receipt_url, supplier_name, invoice_reference, status, notes,
recorded_by, created_at, updated_at
```

### CRITICAL — Column name mismatches in existing hook:
`hooks/useExpenses.ts` uses WRONG column names — fix them:
| Hook uses            | Actual DB column       |
|----------------------|------------------------|
| `recurring_interval` | `recurrence_interval`  |
| `recurring_end_date` | `recurrence_end_date`  |
| `created_by`         | `recorded_by`          |

These must be fixed alongside the new features or expenses will silently fail to save.

### Key files:
- `hooks/useExpenses.ts` — `createExpense`, `updateExpense`, `useExpenses`, `useExpenseCategories`
- `app/(admin)/finance/expenses/new.tsx` — Log Expense form (screenshot shows current state)
- `app/(admin)/finance/index.tsx` — Finance dashboard using `useFinanceReport`
- `app/(admin)/dogs/[id]/index.tsx` — Dog detail tabs
- `app/(admin)/litters/[id]/index.tsx` — Litter detail screen
- `lib/finance/queries.ts` — `fetchAllExpenses`, `buildFinanceReport`

---

## What to build — 6 tasks

---

### Task 1 — Migration 0026: VAT fields + payment accounts + allocation type

**File:** `supabase/migrations/0026_expense_vat_payment.sql`

```sql
-- 0026 — Expense upgrade: VAT breakdown, payment accounts, allocation type

-- Payment accounts table (which bank/cash account was used)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank'
    CHECK (account_type IN ('bank', 'card', 'cash', 'other')),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Default accounts for Diedericks Dobermanns
INSERT INTO payment_accounts (name, account_type, sort_order) VALUES
  ('FNB Business Account', 'bank', 1),
  ('FNB Savings Account',  'bank', 2),
  ('Petty Cash',           'cash', 3),
  ('Credit Card',          'card', 4)
ON CONFLICT DO NOTHING;

-- RLS: read for all authenticated, write for admin
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_accounts_read" ON payment_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_accounts_admin_write" ON payment_accounts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Expense upgrades
ALTER TABLE expenses
  -- VAT breakdown
  ADD COLUMN IF NOT EXISTS price_excl_vat    numeric(12,2),
  ADD COLUMN IF NOT EXISTS vat_applicable    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate          numeric(5,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS vat_amount        numeric(12,2) DEFAULT 0,

  -- Payment tracking
  ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES payment_accounts(id),
  ADD COLUMN IF NOT EXISTS payment_account_name text,  -- denormalised for history

  -- Allocation clarity
  ADD COLUMN IF NOT EXISTS allocation_type   text NOT NULL DEFAULT 'general'
    CHECK (allocation_type IN ('general', 'dog', 'litter'));

-- Backfill: existing expenses — price_excl_vat = amount (assumed no VAT on historic data)
UPDATE expenses SET price_excl_vat = amount WHERE price_excl_vat IS NULL;

-- Index for dog/litter lookups in reports
CREATE INDEX IF NOT EXISTS idx_expenses_dog_id    ON expenses(dog_id)    WHERE dog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_litter_id ON expenses(litter_id) WHERE litter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_alloc     ON expenses(allocation_type);
```

> **Apply via Supabase MCP before any code changes.**

---

### Task 2 — Update `hooks/useExpenses.ts`

#### 2a — Fix column name mismatches throughout the file

Search and replace ALL occurrences:
- `recurring_interval` → `recurrence_interval`
- `recurring_end_date` → `recurrence_end_date`
- `created_by` → `recorded_by`

#### 2b — Extend `CreateExpenseInput` interface

```typescript
interface CreateExpenseInput {
  category_id: string;
  description: string;
  // VAT fields
  price_excl_vat: number;
  vat_applicable: boolean;
  vat_rate: number;         // default 15
  vat_amount: number;       // calculated: price_excl_vat * vat_rate / 100 (or 0)
  amount: number;           // total = price_excl_vat + vat_amount
  // Existing
  expense_date: string;
  supplier_name?: string;
  invoice_reference?: string;
  // Allocation
  allocation_type: 'general' | 'dog' | 'litter';
  dog_id?: string | null;
  litter_id?: string | null;
  // Payment
  payment_account_id?: string | null;
  payment_account_name?: string | null;
  // Existing
  receipt_url?: string | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  notes?: string;
}
```

#### 2c — Update `createExpense` to write new columns

```typescript
const { error } = await supabase.from('expenses').insert({
  category_id: input.category_id,
  description: input.description,
  price_excl_vat: input.price_excl_vat,
  vat_applicable: input.vat_applicable,
  vat_rate: input.vat_rate,
  vat_amount: input.vat_amount,
  amount: input.amount,
  expense_date: input.expense_date,
  supplier_name: input.supplier_name ?? null,
  invoice_reference: input.invoice_reference ?? null,
  allocation_type: input.allocation_type,
  dog_id: input.dog_id ?? null,
  litter_id: input.litter_id ?? null,
  payment_account_id: input.payment_account_id ?? null,
  payment_account_name: input.payment_account_name ?? null,
  receipt_url: input.receipt_url ?? null,
  is_recurring: input.is_recurring ?? false,
  recurrence_interval: input.recurrence_interval ?? null,
  recurrence_end_date: input.recurrence_end_date ?? null,
  notes: input.notes ?? null,
  recorded_by: profileId ?? null,
});
```

Apply identical changes to `updateExpense`.

#### 2d — Add new hooks

```typescript
// Expenses for a specific dog — used in dog detail tab
export function useExpensesByDog(dogId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!dogId) { setLoading(false); return; }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(name, colour)')
        .eq('dog_id', dogId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map(mapExpenseRow);
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + r.amount, 0));
    } catch (e) {
      console.error('[useExpensesByDog]', e);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, totalAmount, loading, refresh };
}

// Expenses for a specific litter — used in litter detail section
export function useExpensesByLitter(litterId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!litterId) { setLoading(false); return; }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(name, colour)')
        .eq('litter_id', litterId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map(mapExpenseRow);
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + r.amount, 0));
    } catch (e) {
      console.error('[useExpensesByLitter]', e);
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, totalAmount, loading, refresh };
}

// Helper — extract and map a raw expense row
function mapExpenseRow(r: Record<string, unknown>): ExpenseWithCategory {
  const cat = r.category as { name: string; colour: string } | null;
  return {
    ...(r as unknown as ExpenseWithCategory),
    categoryName: cat?.name ?? 'Other',
    categoryColour: cat?.colour ?? '#888888',
  };
}

// Payment accounts for the picker
export function usePaymentAccounts() {
  const [accounts, setAccounts] = useState<{ id: string; name: string; account_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    supabase
      .from('payment_accounts')
      .select('id, name, account_type')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setAccounts(data ?? []);
        setLoading(false);
      });
  }, []);

  return { accounts, loading };
}
```

Also add `useVatExpenseSummary(from, to)` for the dashboard KPI:
```typescript
export function useVatExpenseSummary(from: string, to: string) {
  const [totalVat, setTotalVat] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    supabase
      .from('expenses')
      .select('vat_amount')
      .eq('vat_applicable', true)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        setTotalVat((data ?? []).reduce((s, r) => s + (Number(r.vat_amount) || 0), 0));
        setLoading(false);
      });
  }, [from, to]);

  return { totalVat, loading };
}
```

---

### Task 3 — Upgrade `app/(admin)/finance/expenses/new.tsx`

This is the main Log Expense form. Rewrite it with:

#### 3a — VAT section (replaces plain Amount field)

```
┌─────────────────────────────────────────────────────┐
│  AMOUNT                                             │
│                                                     │
│  Price (excl VAT)    [R _______________]            │
│                                                     │
│  VAT (15%)           ○────────○  [toggle switch]   │
│                      Off       On                   │
│                                                     │
│  [when VAT ON, show:]                               │
│  VAT Amount          R 0.00 (calculated, read-only) │
│                                                     │
│  Total               R 0.00 (calculated, read-only) │
└─────────────────────────────────────────────────────┘
```

**Logic:**
```typescript
const [priceExclVat, setPriceExclVat] = useState('');
const [vatApplicable, setVatApplicable] = useState(false);
const VAT_RATE = 15;

const priceNum = parseFloat(priceExclVat) || 0;
const vatAmount = vatApplicable ? Number((priceNum * VAT_RATE / 100).toFixed(2)) : 0;
const totalAmount = priceNum + vatAmount;
```

The `amount` saved to DB is always `totalAmount`.  
`price_excl_vat` = `priceNum`  
`vat_amount` = `vatAmount`  
`vat_rate` = `VAT_RATE` (or 0 if not applicable)  
`vat_applicable` = `vatApplicable`

#### 3b — Allocation section (between Supplier and Recurring toggle)

```
┌─────────────────────────────────────────────────────┐
│  ALLOCATION                                         │
│                                                     │
│  [General ●]  [Specific Dog]  [Specific Litter]    │
│                                                     │
│  [when "Specific Dog" selected:]                    │
│  Dog:  [search/picker → FlatList of dogs]          │
│                                                     │
│  [when "Specific Litter" selected:]                 │
│  Litter: [picker → FlatList of litters]            │
└─────────────────────────────────────────────────────┘
```

**State:**
```typescript
const [allocationType, setAllocationType] = useState<'general' | 'dog' | 'litter'>('general');
const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
const [selectedDogName, setSelectedDogName] = useState('');
const [selectedLitterId, setSelectedLitterId] = useState<string | null>(null);
const [selectedLitterName, setSelectedLitterName] = useState('');
```

**Dog picker query:**
```typescript
const { data: dogs } = useAdminDogs(); // already exists in the codebase
// or fetch inline: supabase.from('dogs').select('id, name, status').order('name')
```

**Litter picker query:**
```typescript
// supabase.from('litters').select('id, litter_name, whelp_date').order('whelp_date', { ascending: false }).limit(20)
// Display as: "Litter name — DD Mon YYYY"
```

Show pickers as inline scrollable lists (max height 200, inside a Card) — not separate screens or modals. Show a search/filter input above each list for quick filtering.

#### 3c — Payment account picker (below Invoice Reference)

```
PAYMENT ACCOUNT
[FNB Business ●]  [FNB Savings]  [Petty Cash]  [Credit Card]  [Other]
```

Horizontal chip selector using `usePaymentAccounts()`. "Other" chip reveals a free-text `Input` for a custom account name.

```typescript
const { accounts } = usePaymentAccounts();
const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null);
const [paymentAccountName, setPaymentAccountName] = useState('');
const [customAccount, setCustomAccount] = useState('');
```

#### 3d — Quick-add shortcut: "Save & Add Another"

Add a second button next to SAVE EXPENSE:

```tsx
<View className="flex-row gap-3 mb-8">
  <Button
    label="Save & Add Another"
    variant="outline"
    onPress={handleSaveAndReset}
    loading={saving}
    className="flex-1"
  />
  <Button
    label={editingId ? 'Update' : 'Save Expense'}
    onPress={handleSave}
    loading={saving}
    className="flex-1"
  />
</View>
```

`handleSaveAndReset` — saves the expense, then resets all form state (keeps categoryId and vatApplicable as the user likely wants to add similar expenses). Shows a success toast: `"Expense logged ✓"`.

#### 3e — Fix date field

Replace plain text date input with `DateField` component (built in `CURSOR_PROMPT_DOCUMENT_SHEET_FIX.md`). Import from `@/components/ui/DateField`.

---

### Task 4 — Dog detail: Expenses tab

**File:** `app/(admin)/dogs/[id]/index.tsx`

The dog detail screen has multiple tabs (Edit, Photos, Story, Pedigree, Litter History). Add an **Expenses** tab.

**Tab content:**
```
┌─────────────────────────────────────────────────────┐
│  TOTAL SPENT ON THIS DOG        R 4,800.00         │
│                                                     │
│  [+ Log Expense for this dog]                       │
├─────────────────────────────────────────────────────┤
│  ● Veterinary                                       │
│  Annual vaccinations + health check                 │
│  R 1,200.00  ·  12 May 2026  ·  Vet Practice ABC  │
├─────────────────────────────────────────────────────┤
│  ● Feed & Nutrition                                 │
│  Monthly feed allocation                            │
│  R 3,600.00  ·  1 Jun 2026                        │
└─────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// In dog detail tabs array, add:
{ key: 'expenses', label: 'Expenses' }

// Tab content component (inline or in components/dogs/DogExpensesTab.tsx):
function DogExpensesTab({ dogId }: { dogId: string }) {
  const { data, totalAmount, loading, refresh } = useExpensesByDog(dogId);
  const router = useRouter();

  // Empty state: "No expenses logged for this dog yet"
  // Loading: skeleton list
  // Populated: list of expense rows with category colour dot, description, amount, date, supplier
}
```

**"+ Log Expense for this dog" button** navigates to:
```typescript
router.push({ 
  pathname: '/(admin)/finance/expenses/new',
  params: { dogId: dogId, dogName: dog.name }
} as never)
```

In `new.tsx`, read `params.dogId` and `params.dogName` on mount:
```typescript
const params = useLocalSearchParams<{ 
  expenseId?: string; 
  dogId?: string; 
  dogName?: string;
  litterId?: string;
  litterName?: string;
}>();

// Pre-fill allocation on mount:
useEffect(() => {
  if (params.dogId) {
    setAllocationType('dog');
    setSelectedDogId(params.dogId);
    setSelectedDogName(params.dogName ?? '');
  }
  if (params.litterId) {
    setAllocationType('litter');
    setSelectedLitterId(params.litterId);
    setSelectedLitterName(params.litterName ?? '');
  }
}, []);
```

---

### Task 5 — Litter detail: Expenses section

**File:** `app/(admin)/litters/[id]/index.tsx`

Add a dedicated **Expenses** section at the bottom of the litter detail screen (or as a tab if the screen already uses tabs).

**Section layout:**
```
┌─────────────────────────────────────────────────────┐
│  LITTER EXPENSES                 TOTAL: R 12,450   │
│  [+ Log expense for this litter]                   │
├─────────────────────────────────────────────────────┤
│  ● Veterinary  ·  Whelping support — vet call-out  │
│  R 2,450  ·  5 Jun 2026  ·  Vet Practice ABC       │
├─────────────────────────────────────────────────────┤
│  ● Feed & Nutrition  ·  Dam nutrition - whelping   │
│  R 10,000  ·  1 May 2026                          │
└─────────────────────────────────────────────────────┘
```

Use `useExpensesByLitter(litter.id)`.

**"+ Log expense for this litter" button** navigates to:
```typescript
router.push({
  pathname: '/(admin)/finance/expenses/new',
  params: { litterId: litter.id, litterName: litter.litter_name ?? 'This litter' }
} as never)
```

---

### Task 6 — Finance dashboard: VAT KPI card + category chart wiring

**File:** `app/(admin)/finance/index.tsx`

#### 6a — Add "VAT Paid" KPI card

After the existing KPI row (income / expenses / net profit / margin), add:

```tsx
const { totalVat } = useVatExpenseSummary(from, to);

// In KPI grid:
<FinanceKpiCard
  label="VAT Paid"
  value={formatAmount(totalVat)}
  icon="receipt-outline"
  subtitle="Input tax — for VAT returns"
/>
```

#### 6b — Expense allocation breakdown (new chart)

Add a second chart below the existing income/expense bar chart — a horizontal breakdown of expenses by allocation type:

```
EXPENSE ALLOCATION
●────────────────────────  General       R 24,200  (68%)
●──────────          Dog-specific        R  6,800  (19%)
●──────              Litter-specific     R  4,700  (13%)
```

Use a simple progress-bar style — no new chart library required. Three rows with `View` width as percentage of total:

```typescript
// Fetch via useExpensesByAllocationType(from, to) — new hook
// Returns: { general: number, dog: number, litter: number, total: number }
const { breakdown } = useExpenseAllocationBreakdown(from, to);
```

Hook implementation:
```typescript
export function useExpenseAllocationBreakdown(from: string, to: string) {
  const [breakdown, setBreakdown] = useState({ general: 0, dog: 0, litter: 0, total: 0 });

  useEffect(() => {
    const supabase = requireSupabase();
    supabase
      .from('expenses')
      .select('allocation_type, amount')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        const rows = data ?? [];
        const general = rows.filter(r => r.allocation_type === 'general').reduce((s, r) => s + r.amount, 0);
        const dog = rows.filter(r => r.allocation_type === 'dog').reduce((s, r) => s + r.amount, 0);
        const litter = rows.filter(r => r.allocation_type === 'litter').reduce((s, r) => s + r.amount, 0);
        setBreakdown({ general, dog, litter, total: general + dog + litter });
      });
  }, [from, to]);

  return { breakdown };
}
```

---

## File summary

| Action | File |
|--------|------|
| CREATE | `supabase/migrations/0026_expense_vat_payment.sql` |
| EDIT | `hooks/useExpenses.ts` — fix column names, add VAT fields, new hooks |
| EDIT | `app/(admin)/finance/expenses/new.tsx` — VAT section, allocation, payment picker, Save & Add Another |
| EDIT | `app/(admin)/dogs/[id]/index.tsx` — add Expenses tab |
| EDIT | `app/(admin)/litters/[id]/index.tsx` — add Expenses section |
| EDIT | `app/(admin)/finance/index.tsx` — VAT KPI card + allocation breakdown |

---

## Execution order

1. Apply `0026_expense_vat_payment.sql` migration via Supabase MCP
2. Regenerate TypeScript types: `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > database.types.ts`
3. Edit `hooks/useExpenses.ts` — fix column names FIRST, then add all new hooks and updated interfaces
4. Edit `app/(admin)/finance/expenses/new.tsx` — add VAT section, allocation, payment picker
5. Create/edit `components/dogs/DogExpensesTab.tsx` (if splitting out)
6. Edit `app/(admin)/dogs/[id]/index.tsx` — add Expenses tab
7. Edit `app/(admin)/litters/[id]/index.tsx` — add Expenses section  
8. Edit `app/(admin)/finance/index.tsx` — VAT KPI + allocation chart

---

## Critical rules

- The `amount` column always stores the **total including VAT** — this is what the finance dashboard sums
- `price_excl_vat` is for VAT reporting/bookkeeping only — do not replace `amount` as the primary figure
- VAT toggle OFF: `vat_amount = 0`, `vat_rate = 0`, `amount = priceExclVat` (no VAT added)
- VAT toggle ON: `vat_amount = priceExclVat * 0.15`, `amount = priceExclVat + vatAmount`, `vat_rate = 15`
- `vat_amount` is always calculated — never let the user type it directly. It's read-only, shown for confirmation
- `allocation_type` defaults to `'general'` — the dog/litter picker only appears when user explicitly switches to Dog or Litter allocation
- Dog picker: show ALL dogs (not just available) — vet bills etc apply to sold or deceased dogs too
- Litter picker: show all litters, most recent first, limit 30
- When `params.dogId` is passed to the expense form, pre-fill allocation and lock it (don't show the allocation type selector — they navigated from a dog, it's a dog expense)
- Column name fix is MANDATORY — the existing hook writes to wrong column names, meaning `recurrence_interval` and `recurrence_end_date` are currently null for all recurring expenses
- `usePaymentAccounts` should cache with a `useRef` or `useState` — it's called multiple times per session
- The "VAT Paid" dashboard figure is input tax only (what we paid to suppliers). It is NOT VAT collected on our sales. The subtitle must say "Input tax — for VAT returns" to avoid confusion
- All new files and modified files must be under 300 lines — split into sub-components if needed
- Run `npx tsc --noEmit` before finishing — fix all TypeScript errors
- No `SELECT *` queries — always specify columns

---

## Testing checklist

**Expense form:**
- [ ] Price excl VAT field is the primary amount input
- [ ] VAT toggle switches between ON/OFF correctly
- [ ] When VAT ON: VAT amount = price × 15% (calculated, not editable)
- [ ] When VAT ON: Total = price + VAT (shown as read-only summary)
- [ ] When VAT OFF: only price shown, VAT amount = 0 saved to DB
- [ ] Allocation defaults to "General"
- [ ] Selecting "Specific Dog" shows a searchable dog list
- [ ] Selecting "Specific Litter" shows a litter list
- [ ] Payment account chips show accounts from DB
- [ ] "Other" payment account chip reveals free-text input
- [ ] "Save & Add Another" saves and resets form (keeps category + VAT setting)
- [ ] Navigating from dog detail pre-fills dog allocation + locks allocation selector
- [ ] Navigating from litter detail pre-fills litter allocation + locks allocation selector
- [ ] Date field shows picker (not plain text input)
- [ ] All form fields save correctly to DB (verify via Supabase table editor)

**Dog detail:**
- [ ] Expenses tab appears in dog detail navigation
- [ ] Expenses tab shows expenses where `dog_id = dog.id`
- [ ] Total amount is correct sum
- [ ] "+ Log Expense for this dog" button navigates to form with dog pre-filled
- [ ] Empty state message when no expenses logged

**Litter detail:**
- [ ] Expenses section appears at bottom of litter detail
- [ ] Shows expenses where `litter_id = litter.id`
- [ ] Total is correct
- [ ] "+ Log expense for this litter" navigates to form with litter pre-filled

**Finance dashboard:**
- [ ] "VAT Paid" KPI card shows correct sum for selected period
- [ ] Allocation breakdown shows general/dog/litter split
- [ ] Allocation percentages add to 100% (or show zero if no expenses)
- [ ] Changing year/month filter updates VAT KPI and allocation breakdown

**Data integrity:**
- [ ] Existing expenses (no VAT fields) still show correctly (price_excl_vat = amount)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors when opening any modified screen
