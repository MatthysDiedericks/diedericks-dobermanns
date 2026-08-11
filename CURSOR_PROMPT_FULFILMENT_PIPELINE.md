# CURSOR PROMPT — Fulfilment: quote → waiting list → allocation → go-home → delivered

Closes the gap between "client has paid" and "dog is in their hands".

**Run after `CURSOR_PROMPT_QUOTE_SYSTEM_FINISH.md`.**
**Repo:** `diedericksdobermann-web` (mirror to the app per the parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand: bg `#111008`, gold `#C4A35A`, Cinzel / Lato.

---

## Read this first — most of the schema already exists

`waiting_list` is already a full pipeline table. **Do not create a new one.** It has:

```
pipeline_stage, position, priority, status
application_id, client_id, quote_id
enquirer_name / _email / _phone / _country      -- pre-account enquirers
preferred_category, preferred_sex, preferred_colour, ear_preference,
  tail_preference, registration_type, preference_notes
payment_status, deposit_amount, deposit_paid_date, deposit_invoice_id,
  balance_invoice_id, quoted_price, quote_sent_date, quote_expires_date
assigned_dog_id, assigned_litter_id            -- allocation already modelled
source, date_added, last_contact_date, follow_up_date, contacted_count
hold_reason, hold_until, do_not_sell_reason, admin_notes, internal_flags
```

`litters` already has: `expected_date`, `actual_date`, `go_home_date`, `go_home_weeks`,
`go_home_earliest`, `go_home_latest`, `mating_date`, `whelp_date_earliest/latest`.

So this prompt is mostly **wiring and screens**, not new modelling.

---

## 1. Quote numbering is NOT implemented — build it

There is no generation logic anywhere in the codebase; `quote_number` is whatever the caller
passes. Build it properly:

- A Postgres sequence starting at **1133** (the kennel's historical stationery ended at 1132).
- Assign on insert via a `BEFORE INSERT` trigger or a `DEFAULT`, so it cannot be skipped or
  duplicated by any code path — including the app and any future script.
- Format `DD-1133`, `DD-1134`, … Unique index on `quote_number`.
- This number is the **payment reference** on the letterhead.

Say clearly at the end of your run that the migration **needs applying** — Cursor cannot
reach Supabase, and six migrations have already been left unapplied on this project.

## 2. After payment: waiting list OR direct allocation

On the admin quote detail, once proof of payment is confirmed, offer two routes:

**a) Add to waiting list** — creates a `waiting_list` row carrying `client_id`,
`application_id`, `quote_id`, `deposit_amount`, `deposit_paid_date`, and the buyer's
preferences from their application (`preferred_sex`, `preferred_colour`, `preferred_category`).
Set `payment_status` to reflect the deposit. Position appends to the end of that list.

**b) Allocate a specific dog now** — a picker grouped by the same `DOG_GROUPS` used elsewhere
(Available Puppies / Elite Developed / Fully Trained Protection Dogs). On confirm:

- set `waiting_list.assigned_dog_id` (create the row if there isn't one), and
- call the existing `allocateDogToClient()` in
  `src/app/admin/(panel)/dogs/allocation-actions.ts` — **do not write a second allocation
  path**. That action already sets `dogs.owner_id` **and** a confirmed `reservations` row,
  which is what the portal RLS reads.

Allocating must immediately make the dog visible in that client's portal, with its lineage
certificates. That already works once `owner_id` is set — verify it end to end.

## 3. Delivery tracking — the one genuinely missing piece

`dogs` has no delivery columns, so "sold but not yet delivered" cannot be expressed.
Add to `dogs`:

```sql
alter table public.dogs
  add column if not exists handover_status text
    check (handover_status is null or handover_status in
      ('awaiting_go_home','ready','scheduled','delivered')),
  add column if not exists handover_date date,        -- planned
  add column if not exists delivered_at timestamptz,  -- actual
  add column if not exists delivery_method text,      -- collected | delivered | flown
  add column if not exists delivery_notes text;
```

`status='sold'` stays the commercial fact; `handover_status` is the logistics. Do not
overload one field with both — a dog can be sold for weeks before it goes home.

## 4. The lists Matt actually needs

New admin page `/admin/fulfilment` with three tabs, each showing count badges:

1. **Paid & waiting** — clients with a deposit or full payment but **no** `assigned_dog_id`.
   Columns: client, amount paid, date paid, preferences, days waiting, litter they are
   waiting on. Sort oldest-first — the person who has waited longest is the one at risk.
2. **Allocated, not delivered** — `assigned_dog_id` set and `handover_status <> 'delivered'`.
   Columns: client, dog, litter, go-home date, days until/overdue, handover status.
   **Overdue go-home dates in red.**
3. **Delivered** — recent handovers, most recent first, for reference.

Each row links to the client, the dog and the quote. This page is the daily working view —
make it fast and scannable, not pretty.

## 5. Go-home dates on the litter, visible to clients

Admin, on the litter edit screen: `go_home_date`, `go_home_weeks`, `go_home_earliest`,
`go_home_latest`. When `actual_date` and `go_home_weeks` are set, **suggest**
`actual_date + go_home_weeks` as the go-home date but let it be overridden — a litter can be
held back.

Client portal, on their dog and on their waiting-list entry, show:

- "Expected go-home: **12 October 2026**" when a firm `go_home_date` is set.
- "Expected go-home: **early October**" when only the earliest/latest window is known.
- Nothing at all when no date exists. **Never show a placeholder or a guessed date** — a buyer
  will book flights and take leave around this. An uncertain window stated as a firm date is
  worse than saying nothing.
- Also show it on the public litter page for an expected litter, since it is a selling point.

When a go-home date is **changed**, email the affected clients: they plan travel around it.

## 6. Portal visibility

The client's portal should answer, without them asking:

- Where am I in the queue? (waiting-list position, if you choose to show it)
- What have I paid? (deposit, balance outstanding)
- Which dog is mine? (once allocated, with photos and lineage)
- When can I collect? (go-home date or window)

---

## Critical warnings

- **Reuse `allocateDogToClient()`.** A second allocation path that sets only `owner_id` and
  not the reservation will silently break portal access, because RLS checks both.
- **Never** re-add a client UPDATE policy on `quotes` — acceptance is RPC-only. A client
  rewrote a R45,000 quote to R1 in testing when a direct-update policy existed.
- Do not show a client a go-home date the kennel has not committed to.
- `waiting_list` holds `enquirer_*` fields for people **without** accounts — handle both
  linked (`client_id`) and unlinked entries everywhere. Do not assume `client_id` is set.
- `requireAdmin()` on every admin action; portal routes use the request-scoped client so RLS
  applies. No `createAdminClient()` in a portal route.
- No file over 300 lines. Loading, empty and populated states everywhere.
- Mirror the new screens into the app repo per the standing parity rule.

## Verify

- [ ] Two quotes created in a row get sequential numbers starting DD-1133, with no gaps or duplicates.
- [ ] Confirming payment offers both "add to waiting list" and "allocate a dog".
- [ ] Allocating sets `owner_id` **and** a confirmed reservation; the dog appears in that client's portal with lineage certificates.
- [ ] "Paid & waiting" lists only clients with payment and no dog, oldest first.
- [ ] "Allocated, not delivered" shows go-home dates, with overdue in red.
- [ ] Marking delivered moves the row to the Delivered tab and stamps `delivered_at`.
- [ ] A litter with `actual_date` + `go_home_weeks` suggests a go-home date, and it can be overridden.
- [ ] The client sees the go-home date on their dog; sees nothing when no date is set.
- [ ] Changing a go-home date emails affected clients.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. Migrations live in the **app** repo
(`diedericks-dobermanns/supabase/migrations/`) — commit them there and state that they still
need applying.
