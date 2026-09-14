# CURSOR PROMPT — Employees, salary expenses linked to a person, and an Eswatini payslip

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Use the next free migration number — check the highest in
`supabase/migrations/` first.

## Why

Salaries are recorded today as free text in `expenses.description`, under the **Staff** category
(`29d29518-ad0b-4e75-8c24-3436dabf3084`). Three employees appear under at least seven spellings —
"Felicia Salary", "Felicia Salaris", "Salary Felicaia", "Sweli Salary ", "Swelie Salary", "Swelie
salary", "Pierrie Salary", "Piri Salary", "Pierie Pierie Salary". Nothing can answer "what have I
paid Felicia this year", and a duplicate R15,000 salary sat undetected for a week because no two
rows were tied to the same person.

Fix the cause: make the employee a record, make a salary expense point at it, and issue a payslip
off the back of it.

## 1. `employees`

`id uuid pk`, `full_name text not null`, `preferred_name text`, `job_title text`,
`national_id text`, `email text`, `phone text`, `start_date date`, `end_date date`,
`monthly_salary numeric(12,2)`, `currency text not null default 'SZL'`,
`enpf_member boolean not null default true`, `payment_reference text`, `notes text`,
`is_active boolean not null default true`, `created_at timestamptz default now()`,
`updated_at timestamptz default now()`.

RLS: **`is_admin()` on every operation, read included.** This table holds national ID numbers and
salaries. No public read, no client read, no anon policy of any kind. Both `USING` and
`WITH CHECK` on update.

Admin CRUD at `/admin/finance/employees` — list with name, job title, monthly salary, active flag;
a detail page per employee showing pay history from `expenses` and a running total for the year.

Seed nothing. Matt adds Felicia, Pierrie and Sweli himself.

**Currency note:** existing expenses are stored `ZAR`. The Lilangeni is pegged 1:1 to the Rand, so
the figures carry over unchanged, but a payslip for an Eswatini employee must print **E / SZL**.
Take the currency from the employee record, not from the expense.

## 2. Link salary expenses to a person

Add `expenses.employee_id uuid references employees(id) on delete set null` and index it.

In `src/components/finance/CreateExpenseForm.tsx`, when the category is **Staff**, show an
**Employee** dropdown of active employees. Selecting one sets `employee_id`, prefills the
description as `<name> — salary` and the amount from `monthly_salary`, both still editable. The
field is optional — a Staff expense that is not a salary must still save with no employee.

Do not migrate historical rows automatically. Name matching across "Piri" / "Pierrie" / "Pierie
Pierie" will guess wrong on someone's pay record. Add a **"Link to employee"** control on each
unlinked Staff expense so Matt assigns them himself.

## 3. Payslips — Eswatini

New table `payslips`:

`id uuid pk`, `employee_id uuid not null references employees(id) on delete restrict`,
`period_start date not null`, `period_end date not null`, `payment_date date not null`,
`currency text not null default 'SZL'`,
`gross numeric(12,2) not null`,
`deductions jsonb not null default '[]'` — `[{"label":"PAYE","amount":2500},{"label":"ENPF","amount":215}]`,
`net numeric(12,2) not null`,
`employer_enpf numeric(12,2)` (employer's own contribution, shown for the record, **not** deducted
from net), `expense_id uuid references expenses(id) on delete set null`, `notes text`,
`created_by uuid`, `created_at timestamptz default now()`.

`is_admin()` on everything, same as `employees`.

Create from a Staff expense that has an `employee_id`: a **"Create payslip"** action opens a form
pre-filled with the employee, period, payment date and gross. `net = gross − sum(deductions)`,
computed in one helper in `src/lib/finance/payslip.ts` and unit-tested.

### ENPF — suggest, never impose

The Eswatini National Provident Fund is 5% from the employee and 5% from the employer, calculated
on a gross monthly wage ceiling. **For 2026 that ceiling is E4,300, so the capped contribution is
E215 each side, E430 combined.** The ceiling is legislated to rise: E4,600 in 2027, E4,900 in
2028, E5,200 in 2029.

So: store the ceiling in a settings row keyed by year — `enpf_settings(year, wage_ceiling, rate)`
— seeded with 2026 → 4300 → 5%, and editable in admin. Never hardcode 4300 or 215 in a component.

When the form opens, offer a pre-filled ENPF deduction line of `min(gross, ceiling) × rate` and
the matching `employer_enpf`, clearly marked as a suggestion Matt can change or remove. Skip it
when `enpf_member` is false.

### PAYE — record only, never calculate

**Do not compute PAYE.** Eswatini's bands and rebates change and are the employer's liability to
get right. The app records the figure Matt enters. Offer "PAYE" as a named deduction line with an
empty amount; do not derive it, do not suggest it, do not warn about it being blank.

One line in the admin UI, not on the payslip: *"You enter PAYE yourself — confirm the figure with
your accountant or the Eswatini Revenue Service."*

### What the document must carry

Employer's name and address; employee's name and job title; the period covered; the payment date;
gross pay; **each deduction as its own line with what it is for**; the net actually paid; and the
employer's ENPF contribution shown separately as employer cost, never subtracted from net. Leave
optional fields for rate of pay and hours worked, and omit them when empty rather than printing
zeros.

Add a line in the admin UI: *"Have your accountant confirm this against the Employment Act before
you rely on it."* Do not print that on the payslip itself.

Render as an A4 PDF through the existing PDF path — reuse the quote/invoice letterhead approach in
`src/lib/finance/`, do not add a second PDF library. Route `/api/payslips/[id]/pdf`, behind
`requireAdmin()`. Employer name and address come from wherever the invoice letterhead already
sources company details; if there is no address there, add it as a setting rather than hardcoding.

## Critical warnings

- `employees`, `payslips` and `enpf_settings` are admin-only, full stop. Nothing in `(site)`,
  nothing in the client portal, no anon policy. National IDs and salaries must never be reachable
  from a public route.
- Do not auto-link historical expenses by name.
- Do not delete or alter existing `expenses` rows. Felicia's 28 Aug row
  (`39e26a30-4955-48c8-a13f-f9f2a7377e9a`) is deliberately flagged monthly recurring — leave it.
- Do not touch the Zues record or anything in `/admin/fulfilment`.
- No file over 300 lines.

## Verify — in a browser as an admin

- [ ] Adding an employee, then a Staff expense, offers that employee and prefills name and amount;
      changing either still saves.
- [ ] A Staff expense saves with no employee selected.
- [ ] The employee detail page totals only that employee's linked expenses.
- [ ] "Create payslip" pre-fills from the expense; the ENPF line is suggested at E215 for a gross
      above E4,300 and at 5% of gross below it; removing it recalculates the net.
- [ ] Changing the 2026 ceiling in settings changes the suggestion, with no code change.
- [ ] An employee with `enpf_member = false` gets no ENPF line.
- [ ] PAYE appears as an empty line and is never auto-filled.
- [ ] `net = gross − deductions` on the PDF, and employer ENPF is shown separately, not deducted.
- [ ] The PDF shows employer name and address, employee name and job title, period, payment date,
      gross, each deduction with its purpose, and net — on one A4 page, in E / SZL.
- [ ] A payslip with no deductions prints gross = net with no empty deduction table.
- [ ] Signed in as a client, `/admin/finance/employees` and `/api/payslips/[id]/pdf` both refuse.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each.
