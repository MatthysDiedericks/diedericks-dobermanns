# CURSOR PROMPT — Expense capture that beats DogBreederPro, and the ability to fix what you logged

Matt can log an expense and never touch it again. A typo, a wrong category, a wrong amount, a
duplicate — all permanent. And one vet invoice covering nine puppies has to be logged nine times,
because an expense can only point at one dog.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, formatted `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

> **Diedericks Dobermanns is NOT VAT registered.** VAT on a supplier invoice is not reclaimable — it
> is part of the cost. It is recorded so the invoice reads back accurately and so registering later
> is easy. Never use the words "tax-exclusive" or "tax-inclusive" in the UI. Matt should not have to
> know what they mean, and DogBreederPro making him choose is a flaw, not a feature to copy.

**Build in the order below.** Phase 1 is a live gap Matt hits weekly. Phase 2 is a schema change.
Do not start Phase 2 until Phase 1 is deployed and working.

---

## Verified live — do not rebuild any of this

### Website — the actions exist, nothing calls them

`src/app/admin/(panel)/finance/actions.ts` already has, working:

```
createExpense(input)          line 144
updateExpense(id, input)      line 161
deleteExpense(id)             line 175   ← ZERO callers anywhere in the repo
fetchExpenseById(id)          line 184   ← ZERO callers anywhere in the repo
```

`src/components/finance/CreateExpenseForm.tsx` (187 lines) **already accepts an `existing` prop** and
already branches to `updateExpense` at line 73.

Missing: no `finance/expenses/[id]/` route; `expenses/page.tsx` renders rows as plain `<div>`s, not
links; no delete control anywhere.

### App — the edit path is wired and unreachable by one missing `onPress`

`app/(admin)/finance/expenses/new.tsx` **already reads `?expenseId=`** and titles itself "Edit
expense". `hooks/useExpenseForm.ts` already loads via `fetchExpenseById` (line 80) and saves via
`updateExpense` (line 196).

Missing: the list row has **no `onPress`** — only the trash icon does. And `handleDelete` (line 28)
deletes **with no confirmation**.

### The database

`expenses` columns of interest: `amount`, `price_excl_vat`, `vat_applicable`, `vat_rate` (default 15),
`vat_amount`, `dog_id`, `litter_id`, `supplier_name`, `invoice_reference`, `receipt_url`,
`payment_account_id`, `is_payable`, `payable_due_date`, `creditor_name`, `is_recurring`,
`recorded_by`, `source`.

**There is no expense line-items table.** Tables are: `expenses`, `expense_categories`,
`payment_accounts`, `budget_line_items` (unrelated — that is budgeting). One expense = one amount =
one allocation. That is the Phase 2 gap.

---

# PHASE 1 — Fix what exists

## 1 · Reaching the expense

- Website: each row on `/admin/finance/expenses` links to `/admin/finance/expenses/[id]`.
- App: `onPress` on the row pushes `/(admin)/finance/expenses/new?expenseId={id}`.
- Also from the **dog** expenses tab, the **litter** expenses section, the **creditors** list and the finance import result. Audit each and name any list you leave unlinked.

## 2 · The edit screen

Reuse `CreateExpenseForm` / `ExpenseLogForm`. **Do not fork them.**

- Every field editable and pre-filled.
- **Enter it the way the invoice reads.** Amount, VAT, total — with the total updating as he types so it can be checked against the paper in his hand. Never make him work backwards from a gross figure.
- **VAT is typed, not computed.** Default the field to 15% of the amount as a convenience, let him overwrite it, and never silently correct what he entered. Suppliers round differently. If a stored VAT figure stops looking like ~15% after an amount change, note it quietly beside the field — do not change it for him.
- Header: *"Edit expense · logged 14 Aug by Matt"*, from `recorded_by` and `created_at`.
- Cancel returns without saving. Save returns to the list with the change visible.

### The receipt

On edit Matt must be able to **keep it, replace it, or remove it** — three explicit states, not a
file input that silently clears the field when left empty. Replacing uploads the new file first and
only then repoints the row, so a failed upload never loses the original.

## 3 · The totals are understated by R66 029,43 — fix this first

Measured on the live database, 25 August 2026:

```
339 expenses          108 flagged vat_applicable
amount = price_excl_vat on ALL 108        amount = gross on 0
sum(amount)      R1 342 304,32
sum(vat_amount)  R    66 029,43   ← in its own column, never added back
```

`amount` is stored **excluding VAT**, and every total reads `amount`. The business is not VAT
registered, so that VAT left the bank and never comes back. **Expense totals, category totals, dog
and litter allocations, creditor balances, the cashflow forecast and the dashboard are all
understating real spend by R66 029,43.**

### Use a generated column, not a rewrite of 108 rows

```sql
alter table expenses
  add column amount_gross numeric
  generated always as (amount + coalesce(vat_amount, 0)) stored;
```

Point every aggregation at `amount_gross`. This changes no existing value, is reversible, and keeps
the net figure intact — **when Matt registers for VAT, reporting switches back to `amount` and
`vat_amount` becomes reclaimable input VAT. One change, no data migration.** Overwriting `amount`
would destroy the net figure and make registration a painful unpick.

Update `src/lib/finance/queries.ts`, `creditorQueries.ts`, `cashflow/fetch.ts`, `vatDefaults.ts`,
`src/lib/admin/kennel-queries.ts`, and the app's `lib/finance/queries.ts` and `lib/kennel/queries.ts`.

Wherever a total is shown it is the **gross**, with the VAT portion as a quiet sub-line —
*"includes R150,00 VAT"* — and only when there is VAT. Never a `R0,00 VAT` line on the 231 expenses
that have none. **Do not build a VAT return or an input-VAT claim.**

## 4 · Deleting

- Website: a delete control on the edit screen, confirming by name and amount — *"Delete 'Vet — Farm Services' for R1 250,00?"*
- App: **add the same confirmation to the existing trash icon.** Today it deletes on a single tap, no prompt, on a phone, in a list of similar-looking rows. It is the most dangerous control in the finance section.
- After deleting, land on the list with a *"Deleted"* confirmation.

### Two cases that need refusing, not deleting

- **An expense that generated recurring children** — ask: this one only, or this and all future generated entries.
- **An expense reconciled from a bank import** (`source`) — warn that it will reappear on the next import, or block it.

### A revalidation bug to fix here

`deleteExpense` revalidates **only** `${FINANCE_PATH}/expenses`. `createExpense` and `updateExpense`
also revalidate `/creditors`, `/expenses/recurring` and the finance root. So deleting a payable leaves
**creditors, cashflow and the dashboard showing money that no longer exists.** Make all three
revalidate the same set.

## 5 · Keep a trail

- Every edit and delete writes to `audit_log`: who, when, old and new amount at minimum.
- Deleting is a real delete — the audit row is the record. **Do not add an `is_deleted` column**; it would leak into every query in `queries.ts`, `creditorQueries.ts`, `cashflow/fetch.ts` and `kennel-queries.ts` and quietly break the totals.
- Editing must not change `recorded_by`. That is who logged it, not who last touched it.

---

# PHASE 2 — One invoice, many lines

This is where DogBreederPro is genuinely ahead of us and where we should pass it.

Matt's vet bills one visit covering nine puppies. Today that is one expense against one dog, or nine
separate entries typed by hand. Neither is right.

## 6 · Line items

New table `expense_line_items`: `expense_id`, `description`, `amount`, `vat_amount`, `dog_id`,
`litter_id`, `contact_id`, `sort_order`.

- The parent `expenses` row keeps the invoice-level facts — date, supplier, invoice number, category, payment account, payable, receipt.
- **Every existing expense stays valid.** Migrate each current row into a single line item so nothing has to be re-entered and every existing query keeps working. Parent totals are the sum of the lines.
- Header shows a **running total against the invoice**: *"Lines R1 240,00 · Invoice R1 240,00 ✓"*, and says so when they disagree. DogBreederPro does not do this and it is the single thing most likely to catch a capture error.

## 7 · The breeder move DogBreederPro misses

DBP makes you add and link each line by hand. Matt's real case is *"this bill is for the whole
litter"*.

Add **Split across a litter**: choose a litter, and it creates one line per living puppy with the
amount divided evenly, rounded to the cent with the remainder on the first line so the total is
exact. Editable afterwards.

The Claire × Santini litter is nine puppies. That is nine rows in one tap instead of nine typed
entries — and every puppy then carries its true cost, so the profit on a litter is real.

Also allow **Link all lines** at the top — contact, dog or litter — with individual rows overriding,
the way DBP does. That part they got right.

## 8 · Upload the invoice, let it fill the form

DBP offers *"Upload an invoice or receipt and we'll try to populate the details automatically"*. This
is the most valuable thing on their screen and we already have the pieces: a private `documents`
bucket, magic-byte validation in `src/lib/uploads/magic.ts`, and Claude API access.

- Drop a PDF or a phone photo → extract **supplier, date, invoice number, line descriptions and amounts**.
- **Present it as a draft for Matt to confirm, never as a saved record.** Show extracted values in a distinct state until he accepts them. An OCR error that saves itself is worse than no OCR.
- Extraction failing is normal, not an error. Fall back to the empty form with the file already attached, and say *"Couldn't read that one — fill it in and it'll still be attached."*
- The file is stored as the receipt either way.

## 9 · Things Matt shouldn't have to type twice

- **Supplier autocomplete** from previous `supplier_name` values, with that supplier's usual category pre-selected. `vatDefaults.ts` already does category-based VAT defaults — extend the same idea to suppliers.
- **Repeat last** on a supplier: pre-fill a new expense from the most recent one for that supplier.
- Do **not** add a currency selector. Everything is ZAR. DBP's dropdown is a field Matt would have to skip past every single time.

---

## The app

Matt logs expenses on his phone at the feed store and fixes them at his desk — and the reverse.

- Row `onPress` → edit. Same form, same fields, same VAT handling.
- Confirmation before delete. Non-negotiable.
- **Photograph the invoice with the camera and let extraction fill the form** — this is better on the phone than on the website, and it is where he actually is when he gets a paper invoice.
- Line items and split-across-a-litter must work on a phone. If a table will not fit, use stacked cards, not a horizontally scrolling grid.
- Pull-to-refresh reflects an edit made on the website.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Reuse the existing form and actions. `updateExpense`, `deleteExpense`, `fetchExpenseById` already work — wire them, do not rewrite them.
- VAT is typed, never silently recalculated. Totals are gross.
- No "tax-exclusive / tax-inclusive" wording. No currency selector. No VAT return.
- Receipt: keep / replace / remove, explicitly.
- Delete always confirms, on both platforms. Real delete, no soft-delete column.
- `recorded_by` never changes on edit.
- Every existing expense survives the line-items migration untouched.
- Extracted invoice data is always a draft Matt confirms.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

**Phase 1**

- [ ] A row on `/admin/finance/expenses` opens the edit screen. Screenshot.
- [ ] Changing the amount leaves the typed VAT alone, and the total updates. Paste the row before and after.
- [ ] Changing the category moves the expense between category totals. Paste both.
- [ ] Re-allocating from general to a dog makes it appear on that dog's tab and leave the general total.
- [ ] `amount_gross` exists. Paste `select sum(amount), sum(vat_amount), sum(amount_gross) from expenses` — expect **1 342 304,32 · 66 029,43 · 1 408 333,75**.
- [ ] Every total on the finance dashboard now reads gross. Screenshot before and after.
- [ ] A no-VAT expense shows **no** VAT sub-line.
- [ ] Receipt: keep leaves `receipt_url` unchanged; replace repoints it; remove nulls it. Paste all three rows.
- [ ] A failed receipt upload leaves the original attached. Force one and show it.
- [ ] Delete confirms with name and amount, on website **and** app. Two screenshots.
- [ ] **After deleting a payable, creditors, cashflow and the dashboard all drop it with no manual refresh.** This is the revalidation bug — prove it is fixed.
- [ ] Deleting a recurring parent asks about its generated children.
- [ ] Edit and delete each write an `audit_log` row with old and new amount. Paste both.
- [ ] `recorded_by` unchanged after an edit by a different admin. Paste before and after.
- [ ] A non-finance role cannot open the edit route or call the actions. **Test with a real JWT**, not the UI.

**Phase 2**

- [ ] All 339 existing expenses migrated to exactly one line item each, totals unchanged. Paste the count and the sum before and after.
- [ ] A three-line invoice saves, and the parent total equals the sum of the lines.
- [ ] Lines not matching the invoice total is flagged and not silently accepted. Screenshot.
- [ ] **Split across the Claire × Santini litter creates 9 lines** and the amounts sum exactly to the invoice with no rounding drift. Paste the lines and the sum.
- [ ] Each of those 9 puppies shows its share on its own expenses tab.
- [ ] "Link all lines" applies to every row, and an individual row can still override.
- [ ] Uploading a real supplier invoice extracts supplier, date and amounts into a **draft** state Matt must accept. Screenshot.
- [ ] A file extraction cannot read still attaches and shows the friendly message.
- [ ] Supplier autocomplete offers a previous supplier and pre-selects its usual category.
- [ ] App: row opens the edit screen, delete confirms, invoice photographed with the camera fills the form, split-across-litter works on a phone. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] `git status --porcelain` is empty.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the edit route and links, receipt handling, delete with
confirmation, the gross-total fix, the revalidation fix, the audit trail, the line-items migration,
split-across-litter, invoice extraction, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
