# Cursor Prompt — One invoice, many destinations: expense lines, allocation, and cost reports

## Do this first

1. Read the whole file before writing code. The model matters more than the screens.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **This is staged. Do Stage A only, report, and stop.**
4. `npx tsc --noEmit` in both repos at the end of each stage.

**This prompt supersedes part of `CURSOR_PROMPT_LITTER_PROFITABILITY.md`.** That one proposed a
monthly pool of shared costs allocated by dog-days. This is better: allocate **on the invoice line,
at the moment of capture**, with dog-days available as the weighting. Do not build both. The
dog-days engine from that prompt's Stage A is still wanted — it becomes the *weighting function*
here, not the allocation mechanism.

---

## Part 1 — Felicia cannot capture expenses. What I found, and what I could not.

**Her permissions are correct.** Felicia (`felicia03@rocketmail.com`) is `admin`. Matt
(`diedericksdobermannssa@gmail.com`) is `super_admin`. Both are allowed by the row-level security
policy on `expenses`, which calls `is_admin()` — and that function accepts `admin` and
`super_admin` alike. `requireFinance()` in `lib/admin/finance-auth.ts` also allows both. Her admin
account signed in successfully at 08:33 today.

**So nothing in the database or the auth code explains it.** There are no logged errors from the
finance routes at all.

**The most likely cause is that she is signing in with the wrong account.** There are two Felicias:

| Email | Role | Last sign-in |
|---|---|---|
| `felicia03@rocketmail.com` | **admin** | 15 Sep 08:33 |
| `felicianell6@gmail.com` | **client** | 17 Aug |

If she uses the gmail one — likelier on a phone, where the browser autofills a different saved
login — she lands in the client portal with no finance module at all, and the screen simply is not
there. That is not an error; it looks like the feature is missing.

**Task:** when someone reaches an admin route while signed in as a `client`, do not silently
redirect to `/admin/login`, which is what `requireFinance` does today and which reads as "wrong
password". Show: *"You are signed in as <email>, which is a client account. Sign out and use your
staff login."* A redirect that loses the reason is why this has gone unexplained.

**Also fix the one real refusal I found:** `/admin/invite` logged `ADMIN_QUERY_FAILED` four times on
2 Sep with `actor_role: admin` and detail `"admin only"`. An `admin` is being refused there.

**Matt:** before Cursor runs, ask Felicia to read out the email address on her screen. If it is the
gmail one, that is the whole answer and the rest of this task is still worth doing so the next
person is not confused.

---

## Part 2 — The structural problem

`expenses` is a flat table. One row carries **one** `dog_id`, **one** `litter_id`, and **one**
`allocation_type`. A single supplier invoice therefore cannot be recorded truthfully, because a real
invoice looks like this:

```
Agrimark invoice 17702 — 28 Aug 2026 — R14,880.00
  1. Dog food, 8 × 20kg              R11,200   → shared across the dogs eating it
  2. Vet consult — Hunter-King        R 1,450   → one dog
  3. Whelping box + heat lamp         R 1,680   → the Claire × Santini litter
  4. Kennel brooms, hose fittings     R   550   → company overhead, no animal
```

Today Matt must either split that into four separate expense records — which loses the invoice, the
VAT reconciliation and the attachment — or file the whole thing as `general`, which is what has
happened **349 times out of 351**.

**That is why cost-per-dog has never existed.** Not a missing report. A missing table.

## Part 3 — The model

**`expenses` becomes the invoice header.** Supplier, invoice number, date, payment account,
attachment, total, VAT. One row per supplier document.

**New `expense_lines`** — one row per line on that document:

```
id, expense_id, description, quantity, unit_amount, line_amount,
vat_rate, vat_amount, category_id, allocation_kind, created_at
```

`allocation_kind` is one of four, and this is the whole design:

| Kind | Meaning | Example |
|---|---|---|
| `company` | Business overhead. **Never touches an animal's cost.** | brooms, office, accounting fees |
| `dog` | One named dog | Hunter-King's vet consult |
| `litter` | One litter as a unit | whelping box, litter vaccinations |
| `shared` | Split across a set of dogs | the monthly food bill |

**New `expense_allocations`** — the resolved split, one row per line per recipient:

```
id, expense_line_id, dog_id, litter_id, amount, weight, basis_note
```

### The rule that makes this work: resolve once, store forever

When a `shared` line is saved, **compute the split immediately and write the allocation rows.**
Do not compute it at report time.

The reason is decisive: "the currently active dogs" changes every week. If March's food bill is
re-split each time a report runs, last quarter's cost-per-dog changes every time a puppy is sold,
and no number Matt quotes will ever be reproducible. Resolve at capture, store the amounts, and let
the past stay still. Keep `basis_note` — *"18 active dogs on 28 Aug 2026, weighted by age"* — so any
figure can be explained a year later.

### Choosing the set for a `shared` line

Default to **all dogs the kennel owned on the invoice date** — `keep`, `stud`, `retired`,
`in_training`, plus any unsold puppies on the ground — resolved automatically. Matt must not tick
thirty boxes to record a bag of food.

Then let him narrow it: deselect individuals, or pick a group (a litter's puppies, the breeding
females only). Show the resolved list and the per-dog amount **before** he saves.

**Weighting**, as a setting, default on: a puppy counts less than an adult (default `0.5`), a
nursing dam counts more (default `2.0`). Equal split must remain available as one click, because
sometimes it is genuinely equal.

### The arithmetic must balance

Sum of lines = header total. Show the running difference live and refuse to save a header that does
not balance. Sum of allocations = line amount, to the cent — put the rounding remainder on the
largest recipient rather than losing it.

## Part 4 — Capture

One screen, top to bottom: **supplier, invoice number, date, attachment, total** — then lines.

Adding a line should take a few seconds: description, amount, category, and a single allocation
control that switches between the four kinds. Remember the last allocation used for a category, so
"Feed & Nutrition" defaults to `shared` and "Professional Fees" defaults to `company` after a
handful of entries.

**Migrate the 351 existing expenses into headers with a single line each**, carrying their current
`allocation_type` across: `general` → `company`, `litter` → `litter`, `dog` → `dog`. Do not guess at
reclassifying them — leave a bulk reclassify tool on the expenses list and let Matt sort his own
history when he chooses.

## Part 5 — Reports *(Stage C)*

Four, on the finance section, each with a date range and CSV export:

**1. Cost per dog.** Direct + allocated share, per dog, per period. Comparable across dogs, which is
the point — sortable, and groupable by **sex** so bitches and males line up against each other, and
by status so a stud is not compared against a puppy.

**2. Cost per litter.** Direct litter lines + each puppy's allocated share while on the ground +
the dam's share during nursing. Against the litter's income, this is litter profitability.

**3. Company overhead.** Everything marked `company`. The figure that shows what the business costs
to run irrespective of how many dogs are in it — and it should be a *small* fraction. If it is
large, lines are being mis-filed and the report is how Matt finds out.

**4. Reconciliation.** Total expenses = company + dog + litter + shared, always. Any expense with no
lines, or lines that do not balance, appears here as an exception. **Build this one first of the
four** — a cost report nobody can tie back to the bank statement will not be trusted, and this is
what makes it auditable.

---

## Staging

- **Stage A** — the schema: `expense_lines`, `expense_allocations`, the migration of the existing
  351, and the allocation resolver as a pure tested function. **No UI. Report and stop.**
- **Stage B** — the capture screen, and the Felicia fix from Part 1.
- **Stage C** — the four reports, reconciliation first.

---

## Do not

- Do not recompute allocations at report time. Resolve at capture and store.
- Do not make Matt select dogs by hand for the common case.
- Do not put `company` lines into any per-dog or per-litter figure. That is the distinction the
  whole model exists to preserve.
- Do not delete or rewrite the 351 existing expenses beyond wrapping them in a header and a line.
- Do not build the monthly dog-days pool from the profitability prompt as well. One mechanism.
- Do not hard-code the weightings. Settings, defaults above.
- Do not create test expenses in production.

---

## Stage A report

1. The migration, and a count proving all 351 expenses have exactly one line and balance.
2. The resolver as a pure function, with tests: a `shared` line across 18 dogs splitting to the
   cent; a puppy weighted at 0.5; a nursing dam at 2.0; an equal split; a single-dog line.
3. A worked example of the Agrimark invoice above, showing all four allocation kinds on one header
   and the four totals summing to R14,880.00.
4. Confirmation that re-running the resolver later, after a dog is sold, **does not change** the
   stored allocation.
5. `npx tsc --noEmit` clean in both repos.
