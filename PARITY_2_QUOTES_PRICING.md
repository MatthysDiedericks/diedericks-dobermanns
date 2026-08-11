# PARITY PROMPT 2 — Quotes + Pricing on the website

The entire quoting module is app-only. This also unblocks a live problem: **all three
`pricing_tiers` rows are still R0**, because there is no screen to set them outside SQL.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, Cinzel headings.

## Read first

- `diedericks-dobermanns/app/(admin)/quotes/index.tsx`, `new.tsx`, `[id].tsx`
- `diedericks-dobermanns/app/(admin)/settings/pricing.tsx`
- `diedericks-dobermanns/lib/finance/autoQuoteFromApplication.ts`
- Website invoice screens — `src/app/admin/(panel)/finance/invoices/` — match their layout.

## Tables — already exist

```
quotes(id, quote_number, client_id, historical_client_name, application_id, status,
       currency, subtotal numeric, discount numeric, total numeric, notes,
       valid_until date, converted_invoice_id, created_by, created_at, updated_at)

quote_items(id, quote_id, item_type, dog_id, description, quantity numeric,
            unit_price numeric, line_total numeric, sort_order int)

pricing_tiers(id, tier_key, display_label, description, price numeric, currency,
              is_public bool, sort_order int, updated_by, updated_at, created_at)
```

`pricing_tiers.tier_key` values match `dogs.programme_tier`: `puppy`, `elite_developed`,
`protection_dog`. Keep them aligned — the auto-quote and the public tier filters both
depend on it.

## CRITICAL — do not reimplement conversion

`convert_quote_to_invoice(p_quote_id uuid)` **already exists as a Postgres function**. It
enforces `is_admin()`, refuses to convert twice, requires status `sent` or `accepted`, copies
the line items with type mapping, and flips the quote to `accepted`.

The web quote detail page must call it:

```ts
const { data, error } = await supabase.rpc('convert_quote_to_invoice', { p_quote_id: id });
```

Reimplementing this in TypeScript would give you two sources of truth that will drift. Same
principle applies to quote totals — if the app calculates them in TS, move that into SQL or a
shared helper rather than writing a second copy.

## Screens

### 1. `admin/(panel)/quotes/page.tsx`
List: quote number, client (fall back to `historical_client_name`), total, status, valid-until,
created. Filter by status. Overdue `valid_until` flagged. Link to detail.

### 2. `admin/(panel)/quotes/new/page.tsx`
Create: pick client (or free-text historical name), optional linked application, line items
(add/remove/reorder), discount, validity date, notes. Line totals and subtotal recalculate
live. **Prefill from `pricing_tiers` when a dog with a `programme_tier` is added as a line** —
that is the point of the tiers.

### 3. `admin/(panel)/quotes/[id]/page.tsx`
Detail: full quote, status actions (draft → sent → accepted/declined), **Convert to Invoice**
calling the RPC, and a link to the resulting invoice once `converted_invoice_id` is set.
Disable Convert when already converted, and explain why.

### 4. `admin/(panel)/settings/pricing/page.tsx`
Edit the three tiers: label, description, price, currency, public visibility, sort order.
Saving sets `updated_by` and `updated_at`.

Show a warning banner on any tier still at 0: *"This tier has no price set — quotes and the
public site cannot show a figure until you set one."*

## Wiring

Sidebar: Quotes under Finance; Pricing under Settings. Add outstanding-quote count to the
dashboard as a `CollapsibleCard`.

## Rules

- `requireAdmin()` in every server action; return `{ error }`, never throw.
- Check `error` on every Supabase call and surface it.
- Money is `numeric` — never float arithmetic. Use `formatAmount`.
- No file over 300 lines. Loading, empty and populated states on every list.
- Do not use `createAdminClient()` in these routes.

## Verify

- [ ] Create a quote, send it, convert it — the invoice appears with the same line items.
- [ ] Converting the same quote twice is refused with a clear message.
- [ ] A draft quote cannot be converted.
- [ ] Setting a tier price makes it appear on a new quote line for a dog of that tier.
- [ ] The R0 warning shows for any unpriced tier.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
