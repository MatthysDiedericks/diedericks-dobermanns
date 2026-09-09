-- 0171 — Rebuild anon column grants on dogs after 0169 added listing columns.
-- Safe to re-run. Does not touch dogs rows or unlock microchip_number / price.

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'dogs'
    and column_name not in ('microchip_number', 'price');

  revoke select on public.dogs from anon;
  execute format('grant select (%s) on public.dogs to anon', cols);
end $$;
