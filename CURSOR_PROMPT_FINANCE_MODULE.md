# Cursor Prompt — Finance Module
## Diedericks Dobermanns — App + Website

---

## OVERVIEW

Build a complete Finance module accessible to admin and management roles only.

The finance module covers:
1. **Invoices** — create, send, track payment against dog sales and reservations
2. **Expenses** — log monthly/one-off costs by category with receipt upload
3. **Finance Dashboard** — live P&L summary, income vs expense chart, KPI cards
4. **Income Statement Report** — exportable as PDF and Excel

This is implemented in BOTH:
- The React Native app (for mobile management)
- The Next.js website admin panel (desktop-first, richer experience)

---

## DATABASE — ALREADY MIGRATED

The following tables already exist in Supabase (do not recreate them):
- `expense_categories` — 12 categories seeded (Veterinary, Feed, Equipment, Breeding, etc.)
- `invoices` — with auto-generated invoice numbers (DD-2026-0001), generated `amount_outstanding` column, auto-updated `amount_paid` and `status` via trigger
- `invoice_items` — line items with generated `line_total`
- `invoice_payments` — partial payment tracking; trigger auto-syncs `invoices.amount_paid`
- `expenses` — with category, receipt URL, optional dog/litter link, recurring support

**Important generated columns** (never try to insert into these — they are computed by Postgres):
- `invoices.amount_outstanding` → computed as `total_amount - amount_paid`
- `invoice_items.line_total` → computed as `quantity * unit_price`

**Auto-generated invoice_number** — insert with `invoice_number: ''` or omit it; the trigger sets it automatically.

**Trigger behaviour** — when you insert/update/delete an `invoice_payments` row, the trigger automatically recalculates `invoices.amount_paid`, updates `status` to `partially_paid` or `paid`, and sets `paid_date`.

**Access control** — all finance tables use `is_admin()` RLS. Finance screens must check role before rendering. Roles with access: `admin`, `super_admin`, `management`.

**Update `database.types.ts`** — regenerate TypeScript types from Supabase after reading this: run `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > src/types/database.types.ts` in the web project, or copy the updated types file from the app project once updated there.

---

## PART A — REACT NATIVE APP

### Install required packages
```bash
npx expo install expo-print expo-sharing expo-file-system
npm install xlsx date-fns
```

### Role guard
Create `hooks/useFinanceAccess.ts`:
```typescript
import { useAuthStore } from '@/store/authStore'
export function useFinanceAccess() {
  const role = useAuthStore(s => s.user?.role)
  return ['admin', 'super_admin', 'management'].includes(role ?? '')
}
```
Wrap all finance screens: if `!hasAccess` → render `<AccessDenied />` component (gold lock icon, "Finance access is restricted to management.").

### New tab: Finance

Add to the admin tab navigator. Tab icon: a receipt or chart icon. Label: "Finance".

---

### Screen 1: `app/(admin)/finance/index.tsx` — Finance Dashboard

**Header:** "FINANCE" in Cinzel gold. Year selector (current year default, can go back to prior years). Month filter (All / Jan–Dec).

**Row 1 — KPI Cards (horizontal scroll, 4 cards):**

Card 1 — TOTAL INCOME
- Value: sum of `invoices.amount_paid` WHERE `status NOT IN ('void','cancelled')` AND `issue_date` within selected period
- Delta vs same period last year (up = green, down = red)
- Subtext: "Received"

Card 2 — TOTAL EXPENSES
- Value: sum of `expenses.amount` within selected period
- Delta vs same period last year
- Subtext: "Paid out"

Card 3 — NET PROFIT
- Value: Income − Expenses
- Positive = gold. Negative = red.
- Delta vs same period last year

Card 4 — PROFIT MARGIN
- Value: (Net Profit / Income) × 100, shown as %
- Positive = gold. Negative = red.

**Chart — Monthly Income vs Expenses:**
Use `react-native-chart-kit` BarChart or `victory-native` BarChart.
X-axis: months (Jan–Dec or filtered months).
Two bars per month: Income (gold `#C4A35A`) and Expenses (red `#C0392B`).
Tap a bar → shows tooltip with exact values.

**Section — Income Breakdown by Category:**
Pie or donut chart showing income split by `invoice_items.item_type`:
- Dog Sale
- Deposit (non-refundable)
- Training Fee
- Transport
- Other

**Section — Expense Breakdown by Category:**
Horizontal bar chart. One bar per `expense_categories.name`, sorted by amount DESC.
Bar colour matches `expense_categories.colour`.
Shows: category name | amount | % of total expenses.

**Section — Recent Invoices (last 5):**
Mini list: invoice_number | client name | amount | status badge | date.
"View All Invoices →" link.

**Section — Recent Expenses (last 5):**
Mini list: description | category | amount | date.
"View All Expenses →" link.

**Floating action buttons:**
+ New Invoice (gold)
+ Log Expense (secondary)

---

### Screen 2: `app/(admin)/finance/invoices/index.tsx` — Invoices List

Filter tabs: All | Draft | Sent | Paid | Overdue | Cancelled

Search bar (search by invoice_number, client name).

List of invoices. Each row:
- Invoice number (gold, monospace font)
- Client name
- Dog name (if linked)
- Issue date
- Total amount (right-aligned)
- Amount outstanding if not fully paid
- Status badge: Draft (grey) | Sent (blue) | Partially Paid (amber) | Paid (green) | Overdue (red) | Void (dim)

Swipe left on row → quick actions: Mark Paid | Edit | Void

Tap row → Invoice Detail screen.

"+ New Invoice" FAB.

---

### Screen 3: `app/(admin)/finance/invoices/new.tsx` — Create Invoice

Step 1 — Client & Link:
- Client picker (searchable from `users` table)
- Optional: link to reservation (dropdown of client's reservations)
- Optional: link to dog or litter
- Issue date (date picker, defaults today)
- Due date (date picker, defaults +14 days)

Step 2 — Line Items:
Dynamic list of line items. Each item:
- Description (text)
- Type picker (Dog Sale / Deposit / Training Fee / Transport / Other)
- Quantity (numeric, default 1)
- Unit price (numeric)
- Line total = quantity × unit price (auto-calculated, shown in gold)

"+ Add Line Item" button.
Subtotal, Discount (optional), Total shown at bottom updating live.

Step 3 — Notes:
- Notes for client (printed on invoice)
- Internal notes (not visible to client)

Save as Draft | Send to Client (future: email via Resend Edge Function)

On save: insert into `invoices` (omit invoice_number — auto-generated by trigger), then insert `invoice_items` rows.

---

### Screen 4: `app/(admin)/finance/invoices/[id].tsx` — Invoice Detail

Display formatted invoice:
- DD monogram / logo top right
- "INVOICE" Cinzel heading, invoice number gold
- Issue date, due date
- Bill To: client name, email, phone
- Line items table: description | qty | unit price | total
- Subtotal, Discount, **TOTAL** (bold gold)
- Amount paid so far (green)
- **Amount Outstanding** (red if > 0)
- Notes section
- Status badge

Admin actions (bottom sheet):
- Record Payment → opens payment modal (amount, date, method, reference)
- Mark as Sent
- Mark as Void
- Edit Invoice (if draft or sent)

Payment modal: inserts into `invoice_payments`. Trigger auto-updates invoice status.

Share button (top right): generates PDF of invoice (see PDF section below) and shares via device share sheet.

---

### Screen 5: `app/(admin)/finance/expenses/index.tsx` — Expenses List

Filter row: Category pills (All + each category). Month picker. Year picker.

Expense list ordered by expense_date DESC. Each row:
- Category colour dot
- Description
- Category name (muted)
- Date (right)
- Amount (gold, right)
- Recurring badge if `is_recurring = true`

Swipe left → Edit | Delete

Running total shown at top of current filter: "R 12,450 — 23 expenses"

"+ Log Expense" FAB.

---

### Screen 6: `app/(admin)/finance/expenses/new.tsx` — Log Expense

Form:
- Category picker (grid of category pills with colour dots)
- Description (text, required)
- Amount (numeric keyboard, required)
- Date (date picker, defaults today)
- Supplier name (optional)
- Invoice reference (optional)
- Link to dog (optional — for vet expenses)
- Link to litter (optional)
- Is recurring toggle → if on: interval picker (Monthly / Quarterly / Annual) + end date
- Receipt upload: `MediaUploader` component, bucket `receipts`, path `expenses/${Date.now()}/`
- Notes

Save button.

---

### Screen 7: `app/(admin)/finance/reports/index.tsx` — Income Statement

Header: "INCOME STATEMENT"
Date range selector: preset buttons (This Month | This Quarter | This Year | Last Year | Custom)
Custom: from date + to date pickers.

**Report layout (styled like a real P&L):**

```
DIEDERICKS DOBERMANNS
INCOME STATEMENT
Period: 1 January 2026 – 30 June 2026
────────────────────────────────────
INCOME
  Dog Sales                R 150,000
  Deposits Received        R  15,000
  Training Fees            R   4,500
  Transport                R     500
  ─────────────────────────────────
  TOTAL INCOME             R 170,000

EXPENSES
  Veterinary               R  22,000
  Feed & Nutrition         R  18,500
  Breeding                 R  12,000
  Training                 R   8,000
  Equipment                R   5,000
  Marketing                R   4,500
  Transport                R   3,200
  Insurance                R   2,800
  Professional Fees        R   1,500
  Utilities                R   1,200
  Staff                    R  45,000
  Other                    R   1,356
  ─────────────────────────────────
  TOTAL EXPENSES           R 125,056

────────────────────────────────────
NET PROFIT                 R  44,944
PROFIT MARGIN                  26.4%
────────────────────────────────────
```

All figures in gold. Headings in Cinzel. Section totals bold.

**Export buttons (bottom of screen):**

**Export PDF** — uses `expo-print` to render an HTML string as PDF, then `expo-sharing` to share.

**Export Excel** — uses SheetJS (`xlsx`) to generate a workbook, saves to `expo-file-system` cache, then shares.

See export implementation details below.

---

### PDF Export — React Native (`lib/finance/generatePDF.ts`)

```typescript
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

export async function exportFinancePDF(reportData: FinanceReportData) {
  const html = generateIncomStatementHTML(reportData) // returns full HTML string
  const { uri } = await Print.printToFileAsync({ html, base64: false })
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export Income Statement',
    UTI: 'com.adobe.pdf',
  })
}

function generateIncomeStatementHTML(data: FinanceReportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Georgia, serif; background: #fff; color: #1a1a1a; padding: 40px; }
        h1 { font-size: 24px; letter-spacing: 4px; text-transform: uppercase; }
        h2 { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #666; }
        .period { color: #888; font-size: 12px; margin-bottom: 32px; }
        .section-header { font-size: 11px; font-weight: bold; letter-spacing: 2px;
                          text-transform: uppercase; border-bottom: 1px solid #C4A35A;
                          padding-bottom: 4px; margin-top: 24px; color: #C4A35A; }
        .line-item { display: flex; justify-content: space-between; padding: 4px 0;
                     font-size: 13px; }
        .line-item.indent { padding-left: 16px; }
        .total-line { display: flex; justify-content: space-between; font-weight: bold;
                      border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
        .net-profit { font-size: 16px; font-weight: bold; color: #C4A35A;
                      border-top: 2px solid #C4A35A; border-bottom: 2px solid #C4A35A;
                      padding: 10px 0; margin-top: 16px; }
        .footer { margin-top: 48px; font-size: 10px; color: #999;
                  border-top: 1px solid #eee; padding-top: 12px; }
        .amount { font-variant-numeric: tabular-nums; }
      </style>
    </head>
    <body>
      <h1>Diedericks Dobermanns</h1>
      <h2>Income Statement</h2>
      <div class="period">Period: ${data.periodLabel}</div>

      <div class="section-header">Income</div>
      ${data.incomeLines.map(l => `
        <div class="line-item indent">
          <span>${l.label}</span>
          <span class="amount">R ${formatAmount(l.amount)}</span>
        </div>`).join('')}
      <div class="total-line">
        <span>TOTAL INCOME</span>
        <span class="amount">R ${formatAmount(data.totalIncome)}</span>
      </div>

      <div class="section-header" style="margin-top:24px">Expenses</div>
      ${data.expenseLines.map(l => `
        <div class="line-item indent">
          <span>${l.label}</span>
          <span class="amount">R ${formatAmount(l.amount)}</span>
        </div>`).join('')}
      <div class="total-line">
        <span>TOTAL EXPENSES</span>
        <span class="amount">R ${formatAmount(data.totalExpenses)}</span>
      </div>

      <div class="net-profit" style="display:flex;justify-content:space-between">
        <span>NET PROFIT</span>
        <span class="amount">R ${formatAmount(data.netProfit)}</span>
      </div>
      <div class="line-item" style="color:#666;font-size:12px;margin-top:8px">
        <span>Profit Margin</span>
        <span>${data.profitMargin.toFixed(1)}%</span>
      </div>

      <div class="footer">
        Generated by Diedericks Dobermanns Management System · ${new Date().toLocaleDateString('en-ZA')}
        · CONFIDENTIAL — For management use only
      </div>
    </body>
    </html>
  `
}
```

---

### Excel Export — React Native (`lib/finance/generateExcel.ts`)

```typescript
import * as XLSX from 'xlsx'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export async function exportFinanceExcel(reportData: FinanceReportData) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Income Statement
  const summaryData = [
    ['DIEDERICKS DOBERMANNS'],
    ['INCOME STATEMENT'],
    [`Period: ${reportData.periodLabel}`],
    ['Generated:', new Date().toLocaleDateString('en-ZA')],
    [],
    ['INCOME', '', 'AMOUNT (ZAR)'],
    ...reportData.incomeLines.map(l => [l.label, '', l.amount]),
    ['TOTAL INCOME', '', reportData.totalIncome],
    [],
    ['EXPENSES', '', 'AMOUNT (ZAR)'],
    ...reportData.expenseLines.map(l => [l.label, '', l.amount]),
    ['TOTAL EXPENSES', '', reportData.totalExpenses],
    [],
    ['NET PROFIT', '', reportData.netProfit],
    ['PROFIT MARGIN', '', `${reportData.profitMargin.toFixed(1)}%`],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
  ws1['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Income Statement')

  // Sheet 2: Invoice Detail
  const invoiceData = [
    ['Invoice #', 'Client', 'Dog', 'Date', 'Total', 'Paid', 'Outstanding', 'Status'],
    ...reportData.invoices.map(i => [
      i.invoice_number, i.clientName, i.dogName ?? '',
      i.issue_date, i.total_amount, i.amount_paid, i.amount_outstanding, i.status
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invoiceData), 'Invoices')

  // Sheet 3: Expense Detail
  const expenseData = [
    ['Date', 'Category', 'Description', 'Supplier', 'Amount', 'Dog', 'Recurring'],
    ...reportData.expenses.map(e => [
      e.expense_date, e.categoryName, e.description,
      e.supplier_name ?? '', e.amount, e.dogName ?? '',
      e.is_recurring ? 'Yes' : 'No'
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseData), 'Expenses')

  // Sheet 4: Monthly Summary
  const monthlyData = [
    ['Month', 'Income', 'Expenses', 'Net Profit', 'Margin %'],
    ...reportData.monthlySummary.map(m => [
      m.month, m.income, m.expenses, m.income - m.expenses,
      m.income > 0 ? `${(((m.income - m.expenses) / m.income) * 100).toFixed(1)}%` : '0%'
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyData), 'Monthly Summary')

  // Write and share
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
  const filename = `DD_Finance_${reportData.periodLabel.replace(/\s/g, '_')}.xlsx`
  const fileUri = FileSystem.cacheDirectory + filename
  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  })
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Finance Report',
  })
}
```

---

### Data fetching hook: `hooks/useFinanceReport.ts`

```typescript
// Fetches all data needed for the dashboard and report
// for a given date range

export function useFinanceReport(from: string, to: string) {
  // 1. Invoices in range (with client name via join)
  // 2. Invoice items grouped by item_type (for income breakdown)
  // 3. Expenses in range joined with expense_categories
  // 4. Monthly aggregates for chart
  // 5. KPI deltas vs prior period

  // Return: { invoices, expenses, incomeByType, expenseByCategory,
  //           monthlySummary, totalIncome, totalExpenses, netProfit,
  //           profitMargin, priorPeriodComparison, isLoading, error }
}
```

---

## PART B — NEXT.JS WEBSITE ADMIN PANEL

Add to admin sidebar under "Business" section: **Finances** (with sub-items: Dashboard, Invoices, Expenses, Reports).

Install in web project:
```bash
npm install xlsx jspdf jspdf-autotable date-fns recharts
```

---

### Web Finance Dashboard (`app/admin/finance/page.tsx`)

Server component — fetch data server-side for fast load.

Layout: full-width, 4-col grid on desktop.

**KPI row (4 cards):**
Same as app but using Tailwind. Each card: dark surface `bg-surface border border-gold/20 rounded-sm p-6`.
- Stat value in Cinzel 36px gold
- Label small caps muted
- Delta: green arrow up / red arrow down with % change vs same period last year

**Chart — Monthly Income vs Expenses:**
Recharts `ComposedChart` with:
- `Bar` for Income (fill `#C4A35A` gold)
- `Bar` for Expenses (fill `#C0392B` red)
- `Line` for Net Profit (stroke `#2ECC71` green)
- Responsive, dark grid, gold axis labels

**Income pie chart:** Recharts `PieChart` — income split by `item_type`. Custom legend.

**Expense bar chart:** Recharts horizontal `BarChart` — expenses by category. Each bar coloured from `expense_categories.colour`.

**Recent invoices table:** 5 rows. Columns: Invoice # | Client | Amount | Status badge | Date | Actions (View | Record Payment).

**Recent expenses table:** 5 rows. Columns: Category dot | Description | Amount | Date | Actions.

---

### Web Invoices (`app/admin/finance/invoices/page.tsx`)

Full data table using a `<table>` with Tailwind styling.

Columns: Invoice # | Client | Dog | Issue Date | Due Date | Total | Paid | Outstanding | Status | Actions

Sort by any column (client-side sort with `useState`).
Filter bar: status filter pills + search input + date range.

Row actions: View | Record Payment | Mark Void | Download PDF

"+ New Invoice" button → `/admin/finance/invoices/new`

---

### Web Create Invoice (`app/admin/finance/invoices/new/page.tsx`)

Two-column layout:
Left: form (client picker, dates, notes)
Right: live invoice preview panel (updates as user types)

Line items: dynamic rows with Add/Remove. Auto-calculates totals.

Save as Draft | Send (future email integration)

---

### Web Invoice Detail (`app/admin/finance/invoices/[id]/page.tsx`)

Styled as a real invoice document. Print-ready CSS (`@media print`).

Shows full invoice with all line items, payment history timeline, status.

Action bar top-right:
- **Download PDF** — uses `jsPDF` + `jspdf-autotable` (see below)
- **Record Payment** → modal
- **Mark Void**

---

### Web PDF Export (client-side, `lib/finance/exportPDF.ts`)

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportInvoicePDF(invoice: InvoiceWithDetails) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(17, 16, 8)
  doc.rect(0, 0, 210, 50, 'F')
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(22)
  doc.setFont('times', 'bold')
  doc.text('DIEDERICKS DOBERMANNS', 20, 22)
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text('Precision bred. Professionally trained. Lifetime proven.', 20, 30)

  doc.setTextColor(245, 240, 232)
  doc.setFontSize(28)
  doc.text('INVOICE', 160, 22, { align: 'right' })
  doc.setFontSize(11)
  doc.text(invoice.invoice_number, 160, 30, { align: 'right' })

  // Client & dates
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.text('BILL TO:', 20, 62)
  doc.setFont('times', 'bold')
  doc.text(invoice.clientName, 20, 68)
  doc.setFont('times', 'normal')
  doc.text(invoice.clientEmail, 20, 73)

  doc.text(`Issue Date: ${invoice.issue_date}`, 140, 62)
  doc.text(`Due Date: ${invoice.due_date ?? 'On receipt'}`, 140, 68)

  // Line items table
  autoTable(doc, {
    startY: 85,
    head: [['Description', 'Type', 'Qty', 'Unit Price', 'Total']],
    body: invoice.items.map(i => [
      i.description, i.item_type, i.quantity,
      `R ${i.unit_price.toFixed(2)}`, `R ${i.line_total.toFixed(2)}`
    ]),
    headStyles: { fillColor: [17, 16, 8], textColor: [196, 163, 90], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 249, 245] },
    columnStyles: { 4: { halign: 'right' } },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8

  // Totals
  doc.text('Subtotal:', 145, finalY)
  doc.text(`R ${invoice.subtotal.toFixed(2)}`, 190, finalY, { align: 'right' })
  if (invoice.discount_amount > 0) {
    doc.text('Discount:', 145, finalY + 6)
    doc.text(`-R ${invoice.discount_amount.toFixed(2)}`, 190, finalY + 6, { align: 'right' })
  }
  doc.setFont('times', 'bold')
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(13)
  doc.text('TOTAL:', 145, finalY + 14)
  doc.text(`R ${invoice.total_amount.toFixed(2)}`, 190, finalY + 14, { align: 'right' })

  doc.setFont('times', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.text(`Amount Paid: R ${invoice.amount_paid.toFixed(2)}`, 145, finalY + 22)
  doc.setTextColor(192, 57, 43)
  doc.text(`Outstanding: R ${invoice.amount_outstanding.toFixed(2)}`, 145, finalY + 28)

  // Notes
  if (invoice.notes) {
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(9)
    doc.text('Notes:', 20, finalY + 14)
    doc.text(invoice.notes, 20, finalY + 20)
  }

  // Footer
  doc.setFillColor(17, 16, 8)
  doc.rect(0, 280, 210, 17, 'F')
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(8)
  doc.text('Diedericks Dobermanns · Confidential', 105, 290, { align: 'center' })

  doc.save(`${invoice.invoice_number}.pdf`)
}

export function exportIncomeStatementPDF(report: FinanceReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Similar header
  doc.setFillColor(17, 16, 8)
  doc.rect(0, 0, 210, 45, 'F')
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(18)
  doc.setFont('times', 'bold')
  doc.text('DIEDERICKS DOBERMANNS', 20, 18)
  doc.setFontSize(11)
  doc.text('INCOME STATEMENT', 20, 26)
  doc.setTextColor(245, 240, 232)
  doc.setFontSize(9)
  doc.text(`Period: ${report.periodLabel}`, 20, 34)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 20, 39)

  // Income table
  autoTable(doc, {
    startY: 55,
    head: [['INCOME', 'Amount (ZAR)']],
    body: [
      ...report.incomeLines.map(l => [l.label, `R ${l.amount.toLocaleString('en-ZA', {minimumFractionDigits:2})}`]),
      [{ content: 'TOTAL INCOME', styles: { fontStyle: 'bold' } },
       { content: `R ${report.totalIncome.toLocaleString('en-ZA', {minimumFractionDigits:2})}`, styles: { fontStyle: 'bold' } }]
    ],
    headStyles: { fillColor: [17, 16, 8], textColor: [196, 163, 90] },
    columnStyles: { 1: { halign: 'right' } },
  })

  // Expenses table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['EXPENSES', 'Amount (ZAR)']],
    body: [
      ...report.expenseLines.map(l => [l.label, `R ${l.amount.toLocaleString('en-ZA', {minimumFractionDigits:2})}`]),
      [{ content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold' } },
       { content: `R ${report.totalExpenses.toLocaleString('en-ZA', {minimumFractionDigits:2})}`, styles: { fontStyle: 'bold' } }]
    ],
    headStyles: { fillColor: [17, 16, 8], textColor: [196, 163, 90] },
    columnStyles: { 1: { halign: 'right' } },
  })

  // Net profit
  const y = (doc as any).lastAutoTable.finalY + 12
  doc.setDrawColor(196, 163, 90)
  doc.setLineWidth(0.5)
  doc.line(20, y, 190, y)
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(14)
  doc.setFont('times', 'bold')
  doc.text('NET PROFIT', 20, y + 9)
  doc.text(`R ${report.netProfit.toLocaleString('en-ZA', {minimumFractionDigits:2})}`, 190, y + 9, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text(`Profit Margin: ${report.profitMargin.toFixed(1)}%`, 20, y + 17)
  doc.line(20, y + 21, 190, y + 21)

  // Confidential footer
  doc.setFillColor(17, 16, 8)
  doc.rect(0, 280, 210, 17, 'F')
  doc.setTextColor(196, 163, 90)
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text('CONFIDENTIAL — Management use only · Diedericks Dobermanns', 105, 290, { align: 'center' })

  doc.save(`DD_Income_Statement_${report.periodLabel.replace(/\s/g,'-')}.pdf`)
}
```

---

### Web Excel Export (`lib/finance/exportExcel.ts`)

Same structure as the React Native version but runs in the browser:
```typescript
import * as XLSX from 'xlsx'

export function exportFinanceExcel(report: FinanceReportData) {
  // Same 4-sheet workbook structure as React Native version
  // But use XLSX.writeFile() instead of FileSystem
  const wb = buildWorkbook(report)
  XLSX.writeFile(wb, `DD_Finance_${report.periodLabel.replace(/\s/g,'_')}.xlsx`)
}
```

---

### Web Reports Page (`app/admin/finance/reports/page.tsx`)

Client component (needs interactivity).

Date range picker at top: preset chips + custom date pickers.
"Generate Report" button → fetches data and renders the P&L below.

Rendered P&L table: styled like the app version but in HTML/Tailwind.

Export row (sticky bottom or below report):
- **Download PDF** button → calls `exportIncomeStatementPDF(reportData)`
- **Download Excel** button → calls `exportFinanceExcel(reportData)`

Both buttons: gold, with file type icon.

---

### Client Portal — Invoice View (App only)

In `app/(client)/invoices/index.tsx`:
Clients can view their own invoices. Fetch `invoices WHERE client_id = auth.uid()`.
Read-only list + detail view. Download PDF of their own invoice.
No access to expenses or reports.

---

## ADMIN SIDEBAR UPDATE

Add to admin navigation in both app and website:

```
FINANCE (admin/management only)
  ├── Dashboard
  ├── Invoices
  ├── Expenses
  └── Reports
```

In the app: add Finance tab to admin tab bar.
On the website: add Finance group to admin sidebar with ChartBarIcon.

---

## FILE STRUCTURE — NEW FILES

### React Native App:
```
app/(admin)/finance/
  index.tsx                    ← Dashboard
  invoices/
    index.tsx
    new.tsx
    [id].tsx
  expenses/
    index.tsx
    new.tsx
  reports/
    index.tsx

app/(client)/
  invoices/
    index.tsx                  ← Client views own invoices

hooks/
  useFinanceAccess.ts
  useFinanceReport.ts
  useInvoices.ts
  useExpenses.ts

lib/finance/
  generatePDF.ts
  generateExcel.ts
  formatters.ts               ← formatAmount(), formatPeriod(), etc.
```

### Next.js Website:
```
app/admin/finance/
  page.tsx                     ← Dashboard
  invoices/
    page.tsx
    new/page.tsx
    [id]/page.tsx
  expenses/
    page.tsx
    new/page.tsx
  reports/
    page.tsx

lib/finance/
  exportPDF.ts
  exportExcel.ts
  queries.ts                   ← Supabase query functions for finance
  formatters.ts
```

---

## KEY RULES

- Finance screens check `is_admin()` via Supabase RLS AND check role in UI — double protection
- Never insert into generated columns (`amount_outstanding`, `line_total`) — Postgres computes them
- Invoice number is auto-generated by DB trigger — insert with `invoice_number: ''` or omit it
- Payment trigger auto-updates invoice status — never manually update status after recording a payment
- All amounts stored in ZAR (numeric), displayed with `R` prefix and thousand separators
- Expenses are separate from invoice payments — expenses are costs, invoice payments are income received
- The Income Statement shows: income from `invoices.amount_paid` (cash basis), expenses from `expenses.amount`
- PDF and Excel exports include "CONFIDENTIAL" footer — finance data is sensitive
