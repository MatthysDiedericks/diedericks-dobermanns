# Cursor Prompt — Shop products and receiving stock

**Scope: the shop only. The dog quote process is not touched.**

Verified before writing this: of 53 `quote_items`, **32 are `item_type = 'dog'` carrying no
`catalogue_code` at all** — R915,000 of quoted value. A dog is priced from the dog and its tier, never
from the catalogue. Only 20 lines reference a catalogue item and every one of them is
`delivery_travel`. The link is `quote_items.catalogue_code` (text), which nothing here changes.

Nothing in this prompt alters `quotes`, `quote_items`, `invoices`, pricing tiers, or how a dog is
quoted. The only change that reaches those tables is a **new nullable `product_id` column** on
`quote_items` and `invoice_items`, which existing rows leave null and existing code ignores.

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. `npx tsc --noEmit` in both when done. Paste the real output.
4. Build **Stage 1 only**. Stage 2 is listed at the end so you know where this is going — do not build it.

---

## What is actually there today

Verified against the live database, 18 Sep 2026. Read this before proposing anything, because the
screen's name is misleading.

`/admin/stock` is titled **"Stock — what is loaded, and whether it is actually reaching the shop"**
and shows counters for *Live in shop*, *In shop no photo*, *Internal only*, *Inactive*. Underneath it
is one table, `catalogue_items`, with **12 rows**:

| code | what it really is |
|---|---|
| `export_crate`, `airline_freight` | pass-through logistics cost |
| `export_permit`, `health_certificate`, `rabies_titre`, `vaccination_course`, `microchip` | third-party services |
| `delivery_travel`, `collection_kennel` | services |
| `board_train`, `private_training` | services |
| `puppy_starter_pack` | the only row that could ever be a physical product |

**Not one of these is a stock unit.** All twelve have `price_varies = true`, `default_price = null`,
and `stock_status = 'in_stock'` — a hardcoded default on things that cannot be in or out of stock.
All twelve are `is_active = false` and `is_client_visible = false`, so the public shop is empty.

And there is **no goods-received process to simplify, because none exists**:

```
stock / inventory / stock_movements / suppliers / purchase_orders / grv   →  no such tables
catalogue_items                                                          →  12 rows
equipment_enquiry_items                                                  →  0 rows
cart / checkout / payment in the shop                                    →  none
```

`/(site)/shop` is an **enquiry catalogue**, not a store. There is no cart and no checkout anywhere in
either repo.

One more thing worth naming: **"stock" already means two different things in this admin.**
`/admin/breeding/stock` is breeding stock — dogs. `/admin/stock` is shop items. Same word, same
sidebar, two unrelated meanings.

### So the diagnosis is not "the stock module is complicated"

It is that a price list of services has been dressed as an inventory system. Matt is being asked
*"is this item reaching the shop"* about a state vet's health certificate. The complexity is entirely
in the mismatch, and no amount of UI work on the current screen fixes it.

---

## The decision

**Two different things need two different tables.**

1. **Services and fees** — `catalogue_items`, as today, minus the inventory language. A quote line.
   No quantity, ever. Microchipping does not run out.
2. **Products** — new. Physical things with a count: collars, leads, tugs, food, supplements,
   branded gear, starter packs.

Everything below is about the second one.

### Why build it here rather than buy it

For the record, so this is not revisited in three months:

| | Shopify | Zoho Inventory / Square | Build in Supabase |
|---|---|---|---|
| Cost | ~R730/mo Basic, but **Shopify Payments is not available in South Africa** — third-party gateway plus Shopify's own extra transaction fee on top. Real all-in figures reported for SA stores run R3,000–R13,000/mo | from ~$59/mo | build time only |
| Customers | a **second** customer database and login | n/a | the client portal accounts that already exist |
| Sales land in | Shopify's orders | Zoho's invoices | `quote_items` (53 rows) and `invoice_items` (248 rows) — already built |
| Receiving stock creates an expense | no | partly | **yes** — straight into `expense_lines` / `expense_allocations` |
| Right-sized for ~30 SKUs | over-built | over-built | yes |

The deciding argument is not price. It is that **every buyer is already a client in this system**,
with a contract, an invoice history and a portal login. A rented store means two customer lists, two
order histories, and a reconciliation job forever.

The second argument is the one Matt asked for this morning: cost per dog, cost per litter, cost for
the company. A bag of dog food received into stock and eaten by the kennel is a `shared` expense
line. **No external store can post that into the allocation engine built today.** This one can.

---

## Stage 1 — build this

### 1. Migration, both repos

End with `notify pgrst, 'reload schema';`.

**`products`**

```
id, sku (unique), name, category, unit            -- 'each' | 'kg' | 'bag' | 'pack'
cost_price, sell_price, vat_rate
reorder_level int default 0
image_path, short_description
is_client_visible bool default false
is_active bool default true
created_at, updated_at, updated_by
```

Categories: `feed`, `supplement`, `collar_lead`, `training_equipment`, `apparel`, `starter_pack`,
`other`. A check constraint, not free text.

**`stock_movements` — append-only. This is the important one.**

```
id, product_id, movement_type, quantity numeric,   -- signed: + in, - out
unit_cost, reason, occurred_at,
receipt_id, invoice_id, dog_id, litter_id,          -- nullable links to the cause
created_by, created_at
```

`movement_type in ('receive','sale','adjustment','write_off','internal_use','return')`.

**Quantity on hand is `sum(quantity)` over this table. It is never a column anyone can edit.**
Expose it as a view:

```sql
create or replace view public.v_product_stock
with (security_invoker = true) as
select p.*,
       coalesce(sum(m.quantity), 0)                    as qty_on_hand,
       coalesce(sum(m.quantity), 0) <= p.reorder_level as needs_reorder
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.id;
```

`security_invoker = true` — the value is `true`, not `on`; the daily health check tests this.

Why a ledger and not a `qty_on_hand` column: every count has a cause you can point at, a wrong count
is corrected by a visible adjustment rather than a silent overwrite, and "why do I have 4 collars"
always has an answer. An editable number cannot give you that and will drift within a month.

**`stock_receipts` (the GRV) + `stock_receipt_lines`**

```
stock_receipts:       id, supplier_name, supplier_invoice_no, received_on,
                      total_amount, notes, expense_id, status, created_by, created_at
stock_receipt_lines:  id, receipt_id, product_id, quantity, unit_cost, line_total
```

`status in ('draft','confirmed')`. **Confirming is what writes the movements** — a draft moves nothing.
A confirmed receipt cannot be edited, only reversed by a counter-receipt. Say in a comment why.

**Add `product_id` to `quote_items` and `invoice_items`** (nullable FK). That is the join between the
shop and the money.

**Clean up `catalogue_items`:** drop `stock_status` and `equipment_type`. They are inventory fields on
a service table and they are what made the screen confusing. No data is lost — every row is
`in_stock` / null.

### 2. The receive flow — three steps, and it must be fast

Route: `/admin/stock/receive`. A numbered breadcrumb across the top, same pattern as the whelping
flow. **Step number, step name, and the ability to click back.**

```
1. Supplier  →  2. What's in the box  →  3. Confirm
```

**Step 1 — Supplier.** Supplier name (free text, with autocomplete from previous receipts — do not
build a suppliers table yet), their invoice number, date received. Three fields. Nothing else.

**Step 2 — What's in the box.** A grid, one row per line, keyboard-first:

- Product — a type-ahead on SKU **and** name
- Quantity, unit cost — line total computed
- **Enter adds the next row and focuses the product field.** This is the whole point. Loading a
  20-line delivery must be typing, not clicking.
- **"+ New product" opens inline** — name, category, unit, cost, sell price — and drops straight back
  into the row with it selected. Never navigate away mid-capture.
- Running total against the supplier invoice total, with the difference shown when they disagree.

**Step 3 — Confirm.** The lines, the total, and one question: **how should this be costed?**

- **Company** — overheads, tools, branded gear
- **Shared across the dogs** — feed, general supplements
- **One dog** — pick the dog
- **One litter** — pick the litter

On confirm, in a single transaction:

1. insert `stock_movements` (`receive`, positive) per line
2. insert one `expenses` header plus `expense_lines` using the allocation chosen, through
   `resolveAllocations.ts` — **do not write a second allocation path**
3. store `expense_id` on the receipt
4. show **"Received — 14 items, R4,320, expense posted"** and offer *Receive another* / *Back to stock*

Matt reported this morning that Felicia could not tell whether a save had worked. Same rule: a
receipt is not done until the screen says it is done, with the numbers.

### 3. The stock screen, rebuilt

`/admin/stock` becomes products only, with counters that mean something:

```
ON HAND (value)    NEEDS REORDER    OUT OF STOCK    IN SHOP    TOTAL PRODUCTS
```

Columns: product, SKU, category, on hand, reorder level, cost, sell, margin %, in shop, last movement.
Row click opens the movement history for that product — every in and out, with its cause.

Buttons: **Receive stock**, **Adjust**, **New product**.

Move services to `/admin/settings/catalogue`, titled **"Services & fees"**, and remove the inventory
counters and wording from it entirely. Rename the sidebar entry for `/admin/breeding/stock` to
**Breeding stock (dogs)** so the two meanings of the word stop colliding.

### 4. Selling reduces stock

When an invoice line carries a `product_id` and the invoice is marked paid or delivered, write a
negative `sale` movement linked to that invoice. Reversing the invoice reverses the movement.

**Nothing may go negative without an explicit override**, and an override writes an `adjustment`
movement with a reason. Silent negative stock is how these systems lose trust.

### 5. Tests

- `qty_on_hand` equals the sum of movements after a receive, a sale and an adjustment
- Confirming a receipt twice does not double the stock
- A confirmed receipt cannot be edited
- Receipt → expense → allocations sum to the receipt total to the cent
- A sale that would go negative is blocked without an override
- `v_product_stock` respects `security_invoker`

---

## Do not

- Do not add quantity, stock status or reorder fields to `catalogue_items`. That is the mistake being
  undone.
- Do not store `qty_on_hand` as an editable column on `products`.
- Do not build a suppliers table, purchase orders, barcodes, batch or serial tracking, multi-location
  stock, or stock takes in this pass.
- Do not build a cart or checkout. The shop stays an enquiry catalogue in Stage 1.
- Do not write a second allocation path — use `resolveAllocations.ts`.
- Do not migrate any of the 12 catalogue rows into `products`. They are services. `puppy_starter_pack`
  is the only candidate and **Matt decides**, not you.
- Do not create test products, receipts or movements in production.
- Do not write `security_invoker = on`. It is `true`.

---

## Stage 2 — not now, but design so it fits

Barcode scanning on the phone for receiving and stock takes; a suppliers table with lead times and
reorder suggestions; stock takes with a variance report; cart and checkout with PayFast or Yoco;
low-stock alerts into the existing notification system.

---

## Report

1. The migration, with the tables and the view read back from the live database.
2. A worked receive: a 3-line delivery, typed end to end, with the movements, the expense, and the
   allocations summing to the invoice total to the cent.
3. The stock screen with real counters, and one product's movement history.
4. What happens when a sale would take a product negative.
5. Confirmation that `catalogue_items` still has its 12 rows and no inventory columns.
6. `npx tsc --noEmit` clean in both repos.
