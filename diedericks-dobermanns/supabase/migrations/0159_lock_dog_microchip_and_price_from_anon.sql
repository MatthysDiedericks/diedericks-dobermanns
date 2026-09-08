-- 0159_lock_dog_microchip_and_price_from_anon.sql
-- Applied live 6 Sep 2026.
--
-- WHY THE OBVIOUS FIX DOES NOT WORK
-- Removing a column from the app's .select() string only changes what the APP asks for.
-- PostgREST lets any caller request any column they hold a grant on, so
--   /rest/v1/dogs?select=microchip_number
-- still returned 18 rows to anon after the code fix shipped.
--
-- And `revoke select (microchip_number) ... from anon` ALSO does nothing on its own:
-- anon held TABLE-level SELECT, which covers every column. In PostgreSQL a
-- column-level revoke cannot subtract from a table-level grant. The table grant has
-- to be dropped and replaced with an explicit column list.
--
-- The list is built as "every column EXCEPT the two", so a public page cannot break
-- on a column nobody anticipated. Re-run this block after ANY migration that adds a
-- column to dogs, or anon will not be able to read the new column.

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

-- `authenticated` is untouched: admin, staff and portal screens need both columns
-- (DOG_STAFF_DETAIL_SELECT, quote builder, contract release).

-- VERIFY (expect: denied, denied, 31, 86/7)
--   set local role anon; select count(microchip_number) from dogs;  -- permission denied
--   set local role anon; select count(price)            from dogs;  -- permission denied
--   set local role anon; select count(*)                from dogs;  -- 31
--   as admin: select count(microchip_number), count(price) from dogs; -- 86, 7

-- ROLLBACK:  grant select on public.dogs to anon;
