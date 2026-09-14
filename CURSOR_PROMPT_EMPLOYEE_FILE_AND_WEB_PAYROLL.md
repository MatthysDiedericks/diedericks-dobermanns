# Cursor Prompt — Employee document file + payroll on the website

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericks-dobermanns` (app — payroll already exists here) and `diedericksdobermann-web` (website — has none of it).
3. **This prompt depends on `0173_document_categories.sql`.** That migration replaces the `documents_category_check` constraint with a foreign key to a `document_categories` lookup table. Task 1 below adds rows to that table. **If 0173 has not been applied to the live database yet, stop and tell Matt** — do not write a version that guesses which world it is in.
4. Migration number: highest on disk is `0173`, so this is **0174**. Byte-identical in both `supabase/migrations` folders.
5. Do not apply the migration. Matt applies it.
6. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Where things stand — verified against the live database on 10 Sep 2026

Payroll is built and applied, and has never been used: **0 employees, 0 payslips, 0 expenses linked.**

| Piece | State |
|---|---|
| `employees`, `payslips`, `enpf_settings` tables | live, admin-only RLS |
| `expenses.employee_id` | live |
| ENPF 2026 — ceiling E4,300, rate 5% | seeded |
| App screens (23 files) | built |
| Payslip PDF with letterhead | built |
| **Website** | **nothing at all** |
| **Employee document file** | **does not exist** |

`documents.entity_type` allows `dog, litter, puppy, client, application, training, contract, kennel, health, show, invoice, payment`. There is **no `employee`**, so there is nowhere to keep a contract, ID copy, qualification, warning letter or leave form against a person.

**PAYE is out of scope for this prompt.** The blank PAYE line stays manual. Do not build Eswatini tax brackets here.

---

## Task 1 — Migration 0174

### 1a. Allow `employee` as a document entity type

```sql
alter table public.documents
  drop constraint if exists documents_entity_type_check;
alter table public.documents
  add constraint documents_entity_type_check
  check (entity_type = any (array[
    'dog','litter','puppy','client','application','training',
    'contract','kennel','health','show','invoice','payment','employee'
  ]));
```

Additive only — every existing value stays valid.

### 1b. Employee document categories

These go into `document_categories` (from 0173), **not** into a check constraint.

New keys, all with `entity_types` containing `employee`:

| key | label |
|---|---|
| `employment_contract` | Employment Contract |
| `qualification` | Qualification / Certificate |
| `police_clearance` | Police Clearance |
| `work_permit` | Work Permit |
| `banking_details` | Banking Details |
| `disciplinary_record` | Disciplinary Record |
| `performance_review` | Performance Review |
| `leave_form` | Leave Form |
| `medical_record` | Medical Record |
| `resignation_termination` | Resignation / Termination |

Two existing keys need `employee` **appended** to their `entity_types` array — this is an `update`, not an `insert`. Do not overwrite the array; append if not already present:

- `id_document` (currently `application` only)
- `other`

Use `array_append` guarded by `not (entity_types @> array['employee'])` so re-running the migration is safe.

### 1c. Do not touch

Do not alter the `documents_category_fkey`, do not change any stored `category` value, and do not touch `client_visible` or `is_public` on existing rows.

---

## Task 2 — The security question you must actually answer

An employee file holds national IDs, salaries, bank details, medical records and disciplinary history. This is the most sensitive data on the platform. POPIA applies.

**Do not assume the existing `documents` policies handle it. Prove it.**

Read every row-level security policy on `public.documents` and every storage policy on the `documents` bucket, and answer in writing:

1. Can a **client** with a portal login read a row where `entity_type = 'employee'`? Show the policy expression that stops them, or say that nothing does.
2. Can **anon** read one? Same — show the expression.
3. Can a **trainer** read one?
4. Can a client reach the underlying **file in storage** by path, bypassing the table entirely?

If any policy grants read on a basis other than admin — for example `client_visible = true`, or ownership through `entity_id` matching a client — then an employee document is at risk and you must add an explicit rule:

```sql
-- Employee documents are admin-only. No client, trainer or anon path.
```

Write that policy so it is **restrictive**, not merely another permissive policy alongside the others. Permissive policies are OR'd — adding one does not take access away.

**Storage matters as much as the table.** A row nobody can read is worthless if the object is reachable by URL. Confirm the `documents` bucket is private and that its policies do not fall back to path-prefix matching that an employee path would satisfy.

Report what you found even if the answer is "already safe". A one-line "it's fine" is not a report.

---

## Task 3 — Employee file UI, both platforms

On the employee detail screen, add a **Documents** section using the existing document components. Do not build a second uploader — reuse `UploadDocumentSheet` (app) and the website's equivalent, passing `entityType="employee"` and the employee's id.

- Categories come from `document_categories` filtered on `employee`. **Read them from the database.** Do not hard-code the list you just seeded — that is the exact mistake that broke the applicant upload on 10 September.
- Every employee document is written with `client_visible = false` and `is_public = false`. **Hard-code those two, do not offer them as choices.** There is no legitimate reason to publish an employee's medical record.
- Show upload date, category label, file size and who uploaded it.
- Deleting a document is admin-only and asks for confirmation.

---

## Task 4 — Payroll on the website

The website currently has **zero** payroll files. Build the parity screens under `src/app/admin/(panel)/finance/`:

- `employees/` — list, add, view, edit
- `payslips/new` — the payslip builder
- `enpf/` — the ENPF year settings

Mirror the app's behaviour exactly. **Port the calculation helpers, do not rewrite them.** `payslipNet`, `suggestEnpfContribution`, `periodFromDate`, `deductionsForSave` and `roundMoney` already exist in `diedericks-dobermanns/lib/finance/payslip.ts` with unit tests in `payslip.test.ts`. Copy both files across unchanged and keep the tests running on the website side too.

A second implementation of a payroll calculation is a liability. If you find yourself typing `Math.min(gross, ceiling)` a second time, stop and import instead.

The payslip PDF (`generatePayslipPdf.ts`, `payslipHtml.ts`, `logoBase64.ts`) must produce a **byte-comparable** document from both platforms. Same letterhead, same layout, same currency formatting (`E 1 234.56` for SZL).

Register the new routes with `scripts/check-parity.mjs`.

---

## Do not

- Do not build PAYE brackets, leave tracking, or payslip emailing. Each is its own job. Name them in your report as gaps and move on.
- Do not create any employee or payslip test rows in production. This project has been bitten by that before. If you must test, tell Matt exactly what you created and delete it in the same session.
- Do not change `employees`, `payslips` or `enpf_settings` schema. They are correct.
- Do not weaken the admin-only policies on those three tables.
- Do not revoke EXECUTE on `is_admin` or any function used in a row-level security policy.

---

## Report — real output, not descriptions

1. **The Task 2 security answers in full** — the four questions, each with the policy expression you read. This is the most important item in this prompt.
2. `select count(*) from document_categories where 'employee' = any(entity_types);` — expect **12** (10 new + `id_document` + `other`).
3. Confirmation `documents_entity_type_check` now includes `employee` and still includes all twelve original values.
4. Proof the website imports the app's payslip helpers rather than redefining them — paste the import lines.
5. `npm test` (or the equivalent) showing `payslip.test.ts` passing in **both** repos.
6. `node scripts/check-parity.mjs --strict` passing with the new finance routes matched.
7. `npx tsc --noEmit` clean in both repos.
8. `0174` present in both migration folders, byte-identical — show the diff.

**Then prove it end to end**, after Matt applies the migration: create one employee, upload a PDF to their file, confirm the row lands with `entity_type = 'employee'`, `client_visible = false`, `is_public = false` and a valid category key. Then **sign in as a client and confirm you cannot see it** — in the portal and by hitting the storage URL directly. Delete the test employee and document afterwards and say so.
