# Cursor Prompt — Split an expense across chosen dogs, fix CI, keep deposits in sync

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both, `npm run parity` in the root repo. Paste the real output.
3. Read `src/lib/finance/allocationLedger.ts`, `expenseWrite.ts` and
   `src/components/finance/CreateExpenseForm.tsx` before writing anything.

---

# Part 1 — CI is red. Here is why, job by job.

Run `53695b4` failed all four jobs. I diagnosed each locally. **None of them is a code defect
introduced by the weight work** — but two are real and must be fixed properly, not silenced.

## 1a. Platform parity — REAL, fix by recording the screens

`node scripts/check-parity.mjs --strict` fails with **7 screens on one platform only, unrecorded**:

```
app is missing:      admin/applications/:id/change-tier
                     admin/contacts/new
                     admin/finance/statements        ← new, from the 0196 cash work
website is missing:  admin/applications/change-tier
                     admin/settings/alerts
                     admin/settings/allocation
                     site/shop
```

`admin/applications/change-tier` appears on both sides with different shapes — that is an
**alias**, not two missing screens. Add it to `ALIASES` or to the `aliases` block in
`scripts/parity-exceptions.json`.

For the rest, decide each one deliberately and write the reason into
`scripts/parity-exceptions.json`. `admin/finance/statements` is a desktop bookkeeping screen — a
phone is the wrong place to reconcile a bank statement, and that is a good recorded reason.
`site/shop` on the app needs a real decision from Matt.

**Do not** add a blanket ignore. The check has caught real gaps before; its value is that every
exception carries a sentence explaining itself.

## 1b. Secret scan — FALSE POSITIVE, but fix it properly

Gitleaks flags two JWTs, in `.env.example:7` and `CURSOR_PROMPT_WEBSITE.md:31`. I decoded both:

```
{"iss":"supabase","ref":"nlmwxodvquwbjinhhbmr","role":"anon", ...}
```

Both are the **anon key**, which is public by design — it ships in every client bundle and is
gated by RLS. **No `service_role` key, no `sk-` key, and no other credential is committed.** I
checked every tracked file.

Fix by adding a `.gitleaks.toml` allowlist entry scoped to those two paths, with a comment saying
the anon key is public and RLS is what protects the data. Do **not** disable the job, and do
**not** allowlist the pattern globally — a `service_role` JWT looks almost identical and that job
is the only thing standing between it and a public repo.

## 1c. TypeScript check (mobile) — 12 annotations, must be read

This runs `npm run typecheck` inside `diedericks-dobermanns`. I could not complete it locally
(the sandbox degraded — the same check ran in ~3 minutes earlier today and then stopped
finishing). **Run it yourself and fix the 12 errors.** Do not assume they are stale.

## 1d. npm audit — advisory

`continue-on-error: true`, so it does not gate the merge. Report what it finds; do not force
upgrades that break Expo.

---

# Part 2 — Split one expense across the dogs you choose

## What exists

```
expenses.allocation_type   'company' | 'shared' | 'dog' | 'litter'     (check constraint)
   live counts             shared 350 · dog 4 · litter 2
expense_allocations        expense_line_id, dog_id, litter_id, amount, weight, basis_note
   live rows               8 155   (1 570 carry a litter_id, 8 154 a dog_id)
```

So the ledger already stores **one row per dog with its own amount and weight**. The machinery is
there. What is missing is a way to say *"these particular dogs, and only these"*.

Today `dog` means exactly one dog, and `shared` means every dog the kennel had on that date.
There is nothing in between, which is why 350 of 356 expenses are `shared`.

## What Matt asked for

> *"a dog expense portion where we can link expense to specific dog — I need this more refined so
> that I can select more dogs, owned dogs, specific puppies in different litters (which is also
> together in training), then depending on the amount of dogs selected the expense needs to be
> split between them equally."*

## Build it

**Migration** — extend the constraint, ending `notify pgrst, 'reload schema';`:

```sql
alter table public.expenses drop constraint expenses_allocation_type_check;
alter table public.expenses add constraint expenses_allocation_type_check
  check (allocation_type in ('company','shared','dog','litter','selected'));
```

`selected` = an explicit set of dogs chosen by a human. Keep `dog` working as-is; a single dog is
just `selected` with one member, but existing rows must not be rewritten.

**The picker** in `CreateExpenseForm` must let Matt build one set from dogs that do not otherwise
belong together:

- **Kennel dogs** — `status` in `keep`, `stud`, `in_training`
- **Puppies, grouped by litter**, with a "select whole litter" shortcut per group. Puppies from
  *different* litters must be selectable together — that is the case he named.
- **Dogs in training**, including client-owned dogs boarding with the kennel. A training expense
  splits across whoever was on the truck, regardless of who owns them.

Searchable, multi-select, showing a running count: `7 dogs selected · R1 400,00 each`.

**The split.** Equal by default. In **cents**, and the remainder must land somewhere:

```
R1 000 across 3 dogs → 333.34 / 333.33 / 333.33, not 333.33 × 3
```

Distribute the leftover cents one each to the first N dogs by `birth_order` then `name`, so the
allocation sums **exactly** to the line amount. Write `weight = 1` and a `basis_note` naming what
was chosen — *"Split equally across 7 selected dogs"*. `allocationLedger.ts` reconciles allocations
against line totals; a rounding gap will show up there as an unreconciled line, so this matters.

**Allow an uneven split** as a secondary mode: unlock per-dog amounts, keep a live
`remaining: R0,00` counter, and block save until it is zero. Do not offer percentages — Matt
thinks in rands, and percentages reintroduce the rounding problem he cannot see.

**Editing** an expense re-writes its allocations transactionally: delete and re-insert as one
operation. A partial rewrite leaves an expense allocated to a dog Matt just removed.

**Show it on the dog.** The dog profitability panel must say *"R1 400,00 · share of R9 800,00
vet visit, split across 7 dogs"* — not a bare R1 400. Without that the number looks wrong and
gets queried.

### Do not

- Do not auto-select dogs by date, status or litter without Matt confirming the set.
- Do not allocate to a dog that had already departed on the expense date —
  `findAllocationsToDepartedDogs` in `allocationLedger.ts` already flags these; warn at save time
  rather than letting it write a row the reconciler will complain about later.
- Do not migrate the 350 existing `shared` expenses to `selected`. They are historical and
  correct as they are.

---

# Part 3 — Waiting-list deposits: fix the cause, not just the rows

Matt spotted Xana Garcia's accepted quote DD-1170 (R20 000, R10 000 paid) not reflecting on the
waiting list. **She was not the only one — 7 of 10 entries with a deposit invoice were wrong.**

I corrected the data today (backed up in `dbp_import.litter_data_fixes`):

| | was | now |
|---|---|---|
| Alyssa Buxmann | deposit_amount null | 10 000 |
| Josef Kotze | null (invoice paid in full) | 20 000, `paid_in_full` |
| Ronel Emmenes | null | 10 000 |
| Wanda Von Mollendorff | null | 10 000 |
| Xana Garcia Garcia | null | 10 000 |
| **Gabrielle Kruger** | **stage `quote_sent`** despite R10 000 received | `deposit_paid`, 10 000 |
| **Leandre** | **stage `quote_sent`** despite **R37 500** received | `deposit_paid`, 37 500 |

The last two are the serious ones: R47 500 of client money was in the bank while the waiting list
still showed them as unpaid prospects who could be passed over in an allocation.

**The cause is in code and is not fixed.** `sync_invoice_amount_paid` keeps `invoices.amount_paid`
correct from the payment rows, and `trg_promote_waitlist_invoice_payment` calls
`promote_waitlist_on_payment` — but the waiting-list row's own `deposit_amount`,
`deposit_paid_date` and `payment_status` are only written by `verify_payment_proof`. A payment
recorded through **Record payment** (the normal path) never touches them.

**Fix:** make `promote_waitlist_on_payment` set `deposit_amount`, `deposit_paid_date` and
`payment_status` from the invoice, and advance `pipeline_stage` when the stage is still
pre-deposit. One source of truth: the payment rows.

Then add a health-check query that fails loudly, so this cannot drift silently again:

```sql
select w.enquirer_name, w.pipeline_stage, w.deposit_amount, i.invoice_number, i.amount_paid
from public.waiting_list w
join public.invoices i on i.id = w.deposit_invoice_id
where w.status = 'active'
  and i.amount_paid > 0
  and (w.deposit_amount is distinct from i.amount_paid
       or w.pipeline_stage in ('quote_sent','approved','enquiry','applied'));
```

It must return **0 rows**. Add it to the daily health check.

---

## Report

1. `npm run parity` clean, with the new `parity-exceptions.json` entries and their reasons.
2. `.gitleaks.toml` allowlist, scoped to the two files, and the secret scan passing.
3. The 12 mobile TypeScript errors, and the fixes.
4. One expense of R1 000 split across 3 dogs from **two different litters**, showing
   333.34 / 333.33 / 333.33 and reconciling to exactly R1 000 in `allocationLedger`.
5. That expense on one dog's profitability panel, labelled as a share.
6. The waiting-list drift query returning 0 rows, and a fresh payment through Record payment
   updating `deposit_amount` with no manual step.
7. `npx tsc --noEmit` clean in both repos.
