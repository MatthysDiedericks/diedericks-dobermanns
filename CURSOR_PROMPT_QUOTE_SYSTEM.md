# Cursor Prompt — Quote System: Real Schema, Quick-Add Client, Auto-Numbering, Convert to Invoice

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**Root cause of "quotes are broken":** `app/(admin)/quotes/index.tsx`, `new.tsx`, `[id].tsx` are a genuinely well-built UI (client chip-picker, line items, quick-add-a-dog, discount, valid-until, notes, draft/sent save) — but they're wired to `hooks/useAdmin.ts`'s `useAdminQuotes()` / `hooks/useMutations.ts`'s `saveQuote()`, which query a `quotes` table (and embedded `quote_items`) that **does not exist anywhere in the live database** (confirmed — zero tables matching `quote%`). `useRemoteList` (the helper backing `useAdminQuotes`) falls back to `MOCK_QUOTES` when the real query fails, which is why this has probably looked like it "sort of works" with fake data while never actually saving anything real. This prompt replaces the fake plumbing with a real one — the UI layer mostly stays.

**Also found:** `hooks/useAdmin.ts` has its own `useAdminInvoices()` reading `invoices` with column names that don't match the real schema (`discount`/`total`/`issued_at`/`paid_at`/`quote_id` — the real columns are `discount_amount`/`total_amount`/`issue_date`/`paid_date`, and `quote_id` doesn't exist yet). This is a second, stale invoice code path that duplicates the working one in `lib/finance/queries.ts` (`fetchAllInvoices`, `fetchInvoiceById` — confirmed correct against the live schema, used by the real Finance/Invoices screens). Do not build the quote system on top of `useAdmin.ts`'s pattern — follow `lib/finance/queries.ts`'s pattern instead, and remove `useAdminQuotes`/`useAdminInvoices`/`saveQuote`'s quote logic from `useAdmin.ts`/`useMutations.ts` once the real replacements exist, so there's only one invoice code path and one quote code path, not two.

**Already correct and reusable — do not rebuild:**
- `invoices` / `invoice_items` / `invoice_payments` tables — real, working schema (see `lib/finance/queries.ts`).
- `invoices.client_id` is now **optional** (migrated today) with a `historical_client_name` text fallback for buyers with no app account — reuse this exact pattern for `quotes.client_id`, don't invent a different one.
- `components/finance/LineItemList.tsx` / `LineItemRow.tsx` — reusable line-item editor, already used by the quote builder UI. Keep using it.
- The quote builder screen's overall layout/flow (`app/(admin)/quotes/new.tsx`) — client picker, line items, discount, notes, save-as-draft/sent. Extend it, don't rewrite it from scratch.

---

## Task 1 — Migration: real `quotes` + `quote_items` tables

`supabase/migrations/00XX_quote_system.sql` (check latest applied migration — live DB is currently at a mix of `0037_fix_finance_category_summary_view` plus several unnumbered fix migrations; check `list_migrations` via the Supabase MCP or `supabase migration list` rather than assuming the next local file number, since local `NNNN_*.sql` filenames and what's actually applied live have drifted apart this session — confirm before naming):

```sql
create table quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  client_id uuid references users(id) on delete restrict,
  historical_client_name text, -- quick-add client who isn't an app user, mirrors invoices.historical_client_name
  application_id uuid references applications(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired','cancelled')),
  currency text not null default 'ZAR',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  valid_until date,
  converted_invoice_id uuid references invoices(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  item_type text not null,
  dog_id uuid references dogs(id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  line_total numeric generated always as (quantity * unit_price) stored,
  sort_order int not null default 0
);

alter table invoices add column if not exists quote_id uuid references quotes(id) on delete set null;
```

Add either a NOT NULL constraint requiring at least one of `client_id`/`historical_client_name`, or a check constraint — a quote needs to show *someone's* name even before real linking; check how `invoices.historical_client_name` handles this today (it's just nullable with app-layer display logic, per `fetchInvoiceById`'s `client?.full_name ?? '—'` pattern) and mirror whatever's already established rather than inventing a stricter rule.

RLS: mirror `invoices`' existing policies exactly (admins manage all, clients view their own via `client_id = auth.uid()`) — check the current `invoices` policies (`pg_policies` where tablename='invoices') and replicate the shape for `quotes`/`quote_items`, don't design new ones from scratch.

## Task 2 — Auto quote numbering

Add a Postgres function + trigger (or a `before insert` default) that assigns `quote_number` as `'QTE-' || lpad(nextval('quote_number_seq')::text, 4, '0')` (create the sequence in the same migration) when a new quote is inserted without one. Confirm this doesn't collide with any existing informal numbering — check `historical_income`/`invoices` for any prior use of a "QTE" prefix before finalizing the format (none was found in this session's review, but verify).

## Task 3 — Quote data layer

Create `lib/finance/quoteQueries.ts` (follow the exact pattern of `lib/finance/queries.ts` — typed, `requireSupabase()`, explicit column selects, thrown errors on `.error`, under 250 lines):
- `fetchAllQuotes(statusFilter?: string)`
- `fetchQuoteById(id)` — including `items`
- `createQuote(data, items)` / `updateQuote(id, data, items)` — replaces `saveQuote()` from `useMutations.ts`; delete the old quote-specific logic there once this is wired in (don't leave two versions).
- `createQuickAddClient(fullName, phone, email?)` — inserts a minimal `users` row with `role = 'client'`. **Important:** `users.id` is a hard foreign key to `auth.users(id)` (checked this session) — you cannot insert a `public.users` row without a matching `auth.users` row. For a true walk-in client with no login, do NOT create a fake auth account here — instead use the same `historical_client_name` text-field pattern from Task 1 (no `client_id`, just a name) for the "quick add" case. Only create a real `client_id`-linked record if there's an actual account-creation flow already available (e.g. an admin-invite mechanism) — check `hooks/useAdmin.ts` / the Clients admin screen for whether one already exists before building a new one.
- `convertQuoteToInvoice(quoteId)` — creates an `invoices` row (+ `invoice_items` from the quote's `quote_items`, + `quote_id` back-reference) copying client_id/historical_client_name, discount, notes; sets the new invoice to `status: 'draft'` (not `'paid'` — unlike today's historical migration, a freshly converted quote hasn't been paid yet); sets `quotes.status = 'accepted'` and `quotes.converted_invoice_id`. Wrap in a transaction (or a Postgres function called via RPC) so a partial failure can't leave a quote marked accepted with no invoice, or an orphaned invoice with no quote link.

## Task 4 — Quick-add client in the quote builder

Edit `app/(admin)/quotes/new.tsx`: alongside the existing client chip-picker (fed by `useClients()` — keep this, it's correct for existing app clients), add a "+ Quick add" option that opens a small inline form (name, phone, email — optional) and sets the quote's `historical_client_name` instead of `client_id` when used. The UI should clearly show which mode is active ("Linked client: X" vs "Walk-in: Y") since only one of `client_id`/`historical_client_name` should be set at a time.

## Task 5 — Convert to Invoice action

On `app/(admin)/quotes/[id].tsx`: for quotes with `status = 'sent'` or `'accepted'`, add a "Convert to Invoice" button calling `convertQuoteToInvoice()` from Task 3, then navigate to the new invoice's detail screen. Show the resulting `converted_invoice_id` link on the quote detail screen once converted (so nobody accidentally converts twice — disable the button once `converted_invoice_id` is set).

## Task 6 — Remove the dead code path

In `hooks/useAdmin.ts`: delete `useAdminQuotes` and `useAdminInvoices` (both querying schemas that don't match reality). Grep the codebase for any remaining callers of either before deleting, and repoint them at `lib/finance/quoteQueries.ts` / `lib/finance/queries.ts` respectively. In `hooks/useMutations.ts`: remove the old `saveQuote` quote-specific logic, replaced by Task 3's functions.

---

## Critical warnings

- Do NOT create `auth.users` rows for quick-add walk-in clients — use the nullable `client_id` + `historical_client_name` pattern already established on `invoices` today. Creating login-capable accounts for people who never signed up is a real privacy/security problem, not just a style choice.
- Do NOT leave two parallel invoice- or quote-fetching code paths after this prompt — Task 6 must actually delete the stale one, not just add a new one alongside it.
- Confirm the real next migration number/state via the Supabase MCP or `supabase migration list` before naming this migration — local filenames and live-applied migrations have drifted apart this session (a `0036_document_expiry_reminders.sql` local file, for example, was never applied live until this session manually pushed it — don't assume local file numbers reflect live state).
- `quote_items.line_total` and similar generated columns cannot be written to directly in an INSERT — this bit an insert earlier today on `invoices.amount_outstanding` (also generated). Check `information_schema.columns` / `pg_attribute.attgenerated` before writing insert statements that include computed columns.

## Testing checklist

- [ ] Creating a quote for an existing app client works end-to-end and appears in the quotes list (not mock data)
- [ ] Quick-add walk-in client works, quote shows their name, no `auth.users`/`public.users` row was created
- [ ] Quote number auto-assigns and is unique
- [ ] Convert to Invoice creates a real, correct invoice with matching line items, links back via `quote_id`, and can't be triggered twice
- [ ] `useAdminQuotes`/`useAdminInvoices` (the stale versions) no longer exist anywhere in the codebase
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
