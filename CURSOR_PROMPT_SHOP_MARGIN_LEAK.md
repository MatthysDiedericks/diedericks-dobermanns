# Cursor Prompt — Clients can read your cost price. Fix before any product is loaded.

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

I tested all three jobs against the live database on 18 Sep 2026.

**Litter announcements — correct, nothing to do.** 130 items, column dropped, view enforcing
visibility, and when I tried to insert a second poster for one litter and an announcement with no
litter, both were rejected. Ordinary uploads unaffected. No test rows left.

**Dog departure tracking — correct, nothing to do.** Allocations charging a dog after it left went
**75 → 0** on all three date fields, allocation rows 8,230 → 8,155 (exactly the 75 removed), all 351
lines still balance with a worst difference of **R0.00**, and the four dogs with a null `deceased_at`
were left for you rather than guessed. That is the job done properly.

**Stock module — the schema is the best work of the three, and it has one hole.**

Right: four tables, RLS on all of them, `v_product_stock` at `security_invoker=true`, no `qty_on_hand`
column, sign direction enforced per movement type, receipt-freeze triggers, append-only enforced (I
tried to delete a movement and the trigger stopped me), `catalogue_items` still 12 rows with the
inventory columns gone, and **zero test rows in production**.

---

## The hole

**Any signed-in client can read your cost price.** Tested live, then rolled back:

```
Product ZZ-LEAKTEST, cost R180, sell R650, is_client_visible = true
Read as a client account:
  LEAK: client reads cost R180.00 / sell R650.00
```

### Cause

```sql
policy products_client_read_shop on public.products
  using (is_active and is_client_visible)
```

**Row-level security filters rows. It cannot hide columns.** The policy correctly limits a client to
shop-visible products — and then hands over every column of those rows, including `cost_price`.
`v_product_stock` is `security_invoker = true`, so it inherits that policy and serves `cost_price`
through the view as well.

Nothing has leaked yet, because `products` has zero rows. **It leaks the day you load your first
collar.** That is why this is worth stopping now rather than after the shop is stocked.

Column grants are not the answer here: in Supabase an admin and a client are both the `authenticated`
role, so a column grant that hides `cost_price` from clients hides it from Matt too.

---

## Task

### 1. Clients stop reading `products` at all

New migration, **both repos**, ending in `notify pgrst, 'reload schema';`.

```sql
drop policy if exists products_client_read_shop on public.products;
```

`products_admin` stays. After this, `products` is admin-only — the table that holds cost prices should
never have been readable by a customer.

### 2. Give the shop its own view, carrying only what a shop needs

```sql
create or replace view public.v_shop_products as
select p.id, p.sku, p.name, p.category, p.unit,
       p.sell_price, p.vat_rate, p.image_path, p.short_description,
       coalesce(sum(m.quantity), 0) > 0 as in_stock
from public.products p
left join public.stock_movements m on m.product_id = p.id
where p.is_active and p.is_client_visible
group by p.id;

grant select on public.v_shop_products to anon, authenticated;
```

**No `cost_price`. No `qty_on_hand`** — a customer gets *in stock* or *out of stock*, never the count.
Knowing you hold 3 of something is a negotiating position; it is not a customer's business.

This view is deliberately **security definer** (the default — do **not** set `security_invoker`). That
is the whole mechanism: it reaches past RLS to serve exactly nine safe columns and nothing else. Its
own `where` clause is the gate.

**Add a one-line comment on the view saying that**, because the daily health check tests that every
view in `public` is security invoker and will otherwise report this as a fault tomorrow morning:

```sql
comment on view public.v_shop_products is
  'Security definer by design: the only client-facing window onto products. Excludes cost_price and exact quantities. Do not set security_invoker.';
```

Tell me in your report that you have added it, and I will add the exception to the health check.

### 3. Point the shop at the view

Every client-facing and public read of products goes through `v_shop_products`:

- `src/app/(site)/shop/page.tsx` and its actions
- anything under `portal`
- `app/(public)/shop.tsx` in the Expo repo

`v_product_stock` stays admin-only and keeps `security_invoker = true`. Admin screens keep using it.

**Grep both repos for `from("products")` and list every hit with a verdict — admin or client.** Any
client-side hit is the same bug in a different place.

### 4. Same question, asked of the rest of the module

`stock_movements`, `stock_receipts` and `stock_receipt_lines` are admin-only today and must stay that
way — they carry supplier names, invoice numbers and unit costs. **Confirm no client-readable policy
or view exposes any of them**, and say so explicitly rather than leaving it unstated.

### 5. Tests

- A client reading `products` directly gets **nothing**
- A client reading `v_shop_products` gets name, sell price, image and `in_stock` — and `cost_price`
  is not a column that exists on it
- An inactive or non-client-visible product does not appear in `v_shop_products`
- An admin still reads `cost_price` and `qty_on_hand` through `v_product_stock`
- A product with no movements shows `in_stock = false`

Write the client-read test so it fails loudly if `cost_price` ever reappears in the shop payload.
That test is the permanent fix; the migration is just today's repair.

---

## Do not

- Do not set `security_invoker` on `v_shop_products`. It exists to bypass RLS with a narrow column list.
- Do not put `cost_price`, `qty_on_hand`, supplier names or unit costs into any client-facing view.
- Do not re-add a client policy on `products`.
- Do not change `v_product_stock`.
- Do not create test products, movements or receipts in production. I used a rolled-back transaction
  for the probe above and left nothing behind; do the same.

---

## Report

1. The migration, and `products` policies read back from the live database — `products_admin` only.
2. `v_shop_products` column list, proving `cost_price` is absent.
3. The result of a real client-account read against both `products` and `v_shop_products`.
4. Every `from("products")` in both repos, with admin/client verdicts.
5. Confirmation that the comment is on the view, for the health check.
6. `npx tsc --noEmit` clean in both repos.
