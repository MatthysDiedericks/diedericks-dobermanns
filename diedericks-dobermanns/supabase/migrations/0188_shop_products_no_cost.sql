-- 0188 — Shop products without cost
--
-- WHY: products_client_read_shop let any signed-in client read every column
-- of a shop-visible product, including cost_price. RLS filters rows, not
-- columns. The products table is admin-only after this.
--
-- Clients read v_shop_products instead. It is security definer by default
-- (do not set security_invoker) so it can reach past RLS and serve exactly
-- nine safe columns plus an in_stock boolean — never cost, never a count.
-- Its WHERE clause is the gate. The view comment is the health-check exception.

drop policy if exists products_client_read_shop on public.products;

create or replace view public.v_shop_products as
select p.id, p.sku, p.name, p.category, p.unit,
       p.sell_price, p.vat_rate, p.image_path, p.short_description,
       coalesce(sum(m.quantity), 0) > 0 as in_stock
from public.products p
left join public.stock_movements m on m.product_id = p.id
where p.is_active and p.is_client_visible
group by p.id;

revoke all on public.v_shop_products from anon, authenticated, public;
grant select on public.v_shop_products to anon, authenticated;

comment on view public.v_shop_products is
  'Security definer by design: the only client-facing window onto products. Excludes cost_price and exact quantities. Do not set security_invoker.';

notify pgrst, 'reload schema';
