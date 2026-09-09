-- 0171 — Private receipts bucket. Already applied by hand on production;
-- do not re-run there. Receipts carry supplier, amount and account detail,
-- so public stays false.

insert into storage.buckets (id, name, public, file_size_limit)
values ('receipts', 'receipts', false, 20971520)
on conflict (id) do nothing;

update storage.buckets
   set public = false,
       file_size_limit = 20971520
 where id = 'receipts';

drop policy if exists "receipts admin select" on storage.objects;
create policy "receipts admin select" on storage.objects
  for select
  using (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "receipts admin insert" on storage.objects;
create policy "receipts admin insert" on storage.objects
  for insert
  with check (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "receipts admin update" on storage.objects;
create policy "receipts admin update" on storage.objects
  for update
  using (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "receipts admin delete" on storage.objects;
create policy "receipts admin delete" on storage.objects
  for delete
  using (bucket_id = 'receipts' and public.is_admin());
