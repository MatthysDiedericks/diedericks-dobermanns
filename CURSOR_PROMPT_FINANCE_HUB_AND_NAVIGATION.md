# Cursor Prompt — Finance hub, an accountant login, and a sidebar that fits

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both when done. Paste the real output.
4. **Three parts, in order. Report after each.** Part 1 is what Matt needs this week.

---

## What is actually there

Counted on 19 Sep 2026.

| | |
|---|---|
| Nav groups | 7 |
| Top-level nav items | 38 |
| Nav entries including children | ~63 |
| Pages under `/admin` | 117 |
| Sales invoices | 185 |
| Expenses (purchase invoices) | 351 |
| Roles allowed by `users_role_check` | `visitor`, `client`, `trainer`, `admin`, `super_admin` |
| Users | 26 client, 1 admin, 1 super_admin |

### Three faults, not one

**1. There is no way to reach invoices from the sidebar.** `/admin/finance` has eleven sub-routes —
`budget cashflow creditors debtors employees enpf expenses import invoices payslips reports` — and the
sidebar lists seven of them. **`invoices` is not one of the seven.** Matt runs a business on those 185
records and the only route to them is an in-page tab.

**2. Two navigations disagree about what Finance contains.** The page has its own tab bar (Overview,
Cashflow, Budget, Expenses, Invoices); the sidebar has a different list (Cashflow, Debtors, Budget,
Creditors, Recurring Expenses, Employees, Import). Overlapping, not equal. Whichever one you learn,
the other surprises you.

**3. The sidebar is being used as an index of every page rather than a way to get to work.** That is
why it is 63 entries. Several are not places at all — *Add Entry*, *Record Litter*, *Import Expenses*,
*Invite status*, *Duplicates*, *Pending client files*, *Unlabelled files* are things you **do**, and
they belong as buttons on the page that owns them. And *Audit Log*, *Security*, *Errors* and
*Analytics* — opened maybe monthly — sit at the same level as Litters and Dogs, opened daily.

**The rule to apply throughout: fewer doors, more inside each room. A nav entry is a noun. A verb is a
button.**

---

## Part 1 — The Finance hub, invoice registers, and export

### 1a. One Finance entry in the sidebar

Replace the seven Finance children with **one** link to `/admin/finance`. Everything below lives in a
tab bar on the Finance pages, and the tab bar becomes the single truth for what Finance contains:

```
Overview · Sales invoices · Purchase invoices · Debtors · Creditors ·
Expenses · Budget · Cashflow · Payroll · Reports
```

Keep the existing routes. This is navigation, not a rewrite — do not move or rename any
`/admin/finance/*` path.

### 1b. Sales invoices register — `/admin/finance/invoices`

The full list of all 185, not a dashboard widget:

- Columns: number, date, due, client, country, total, paid, outstanding, status, **Sent**
- Filter: status, date range, client, country, paid/unpaid, sent/never sent
- Search: invoice number or client name
- Sort on any column; default newest first
- **Totals row that reflects the current filter** — invoiced, paid, outstanding. A register whose
  totals ignore the filter is worse than no totals.

### 1c. Purchase invoices register — `/admin/finance/purchases`

The same screen shape over `expenses` — 351 rows. A supplier invoice is an invoice; treat it like one:

- Columns: supplier, their invoice number, date, category, allocation (company/shared/dog/litter),
  net, VAT, total, lines, receipt attached
- Same filters, search, sort, filtered totals
- Row opens the expense with its lines and allocations

### 1d. Export — this is the part the accountant actually needs

On both registers, an **Export** button that exports **what is on screen after filtering**, never the
whole table. Three formats:

- **CSV** — one row per invoice, for a spreadsheet
- **CSV (line level)** — one row per line item, for coding into books
- **PDF pack** — a single PDF: a summary page with the filtered totals, then every invoice rendered
  with the same renderer the client gets, so the bank blocks and addresses match

Every export filename carries the range: `sales-invoices-2026-01-01-to-2026-09-19.csv`.

**Number formatting is not cosmetic here.** Export amounts as plain decimals — `20000.00`, no
thousands separator, no `R` — or every figure lands in a spreadsheet as text and the accountant
re-keys them.

Include the VAT column even though VAT is currently zero. An accountant's import template expects it.

---

## Part 2 — The accountant login

### 2a. The role

`users_role_check` allows `visitor, client, trainer, admin, super_admin`. Add `accountant` in a
migration, both repos, ending `notify pgrst, 'reload schema';`.

`FINANCE_ROLES` in `lib/admin/finance-auth.ts` becomes `admin, super_admin, accountant`.

### 2b. What an accountant can reach — and the part to get right

**An accountant sees `/admin/finance` and nothing else.** Not the admin dashboard, not dogs, not
litters, not applications, not the client list. Signing in lands them on the Finance overview; every
other `/admin/*` route redirects them there.

**This is the security-critical instruction: an accountant login must not become a back door to the
client list.** The registers show a client's **name** because an invoice is meaningless without it.
They must not expose addresses, phone numbers, ID documents, application answers or dog records.

So: do **not** grant the accountant role select on `contacts` or `applications`. Read invoices through
a view that carries only the fields the register shows — invoice fields plus client name and country.
Same for purchases. If you find yourself widening a grant to make a screen work, **stop and report it
instead**; that is the moment this turns into an admin account with a different label.

Accountant is **read and export only**. No create, edit, void, send, or payment capture. Enforce it in
RLS, not only in the UI.

### 2c. Making one

An admin creates an accountant from `/admin/clients` or settings — same invite flow as any other user,
role set to `accountant`. Do not build a separate signup.

---

## Part 3 — The sidebar

Target: **6 groups, about 14 top-level items.** Same destinations, fewer doors.

```
Breeding      Programme · Litters · Dogs · Heat cycles
Clients       Applications · Waiting list · Contacts & clients · Quotes · Contracts · Fulfilment
Finance       Finance
Care          Health · Follow-ups · Training
Content       Gallery · Testimonials & FAQ · Shop (stock + equipment) · Marketing
System        collapsed by default — Documents · To-dos · Issues · System health · Security ·
              Audit log · Analytics · Settings
```

Rules:

1. **Every verb becomes a button on its parent page.** *Add Entry* → button on Waiting list. *Record
   Litter* → button on Litters. *Import Expenses* → button on Expenses. *Duplicates* → tab on
   Contacts. *Pending client files* and *Unlabelled files* → tabs on Documents. *Invite status* → tab
   on Clients. Where the page has no home for it, add a tab bar — the same pattern as Finance.
2. **System is collapsed by default** and remembers its state (`ADMIN_NAV_EXPANDED_KEY` already does
   this).
3. **Merge Contacts and Clients** into one entry with two tabs. They are the same people at different
   stages and having both is a daily "which one was it?".
4. **Merge Stock and Equipment shop** — both are the shop.
5. **Nothing may become unreachable.** After the change, walk every one of the 117 pages under
   `/admin` and prove each is reachable in at most three clicks. List any that are not.

**Do not delete a single route.** This is navigation only. If a page has no sensible home, say so and
leave its route working rather than hiding it.

---

## Do not

- Do not move or rename any `/admin/finance/*` route in Part 1.
- Do not export the whole table when a filter is applied.
- Do not format exported numbers with `R` or thousands separators.
- Do not grant the accountant role access to `contacts`, `applications`, dogs, litters or storage.
- Do not let accountant write anything.
- Do not delete routes in Part 3.
- Do not create test invoices, expenses or users in production. Matt has 185 real invoices and 351
  real expenses — an export test uses those, read-only.

---

## Report

**After Part 1:** the two registers with filters and filtered totals; a CSV opened in a spreadsheet
showing numbers as numbers; a PDF pack for one month; confirmation that no finance route moved.

**After Part 2:** the migration with the role constraint read back live; the list of tables the
accountant role can select, with a one-line justification each; proof that an accountant hitting
`/admin/dogs` is redirected; proof that an accountant insert/update is refused by RLS, not just hidden.

**After Part 3:** the new `adminNav.ts`; before/after counts of groups and entries; the walk of all
117 pages with any unreachable ones named.

`npx tsc --noEmit` clean in both repos at every stage.
