-- Contract auto-generation, release trigger & in-app signature.
-- Adds: signature capture columns on `contracts`, a `released_at` marker on
-- `dogs` (independent of `status` so the existing dogs_status_check constraint
-- and every screen that filters on `status` keeps working unchanged), and a
-- private Storage bucket for signature images (personal data — never public).

alter table public.contracts add column if not exists client_signature_url text;
alter table public.contracts add column if not exists client_signature_device text;

alter table public.dogs add column if not exists released_at timestamptz;

-- Signature images bucket: private. Object path convention is
-- `<client_user_id>/<contract_id>/<timestamp>.png`, mirroring the existing
-- `documents`/`avatars` "owner folder" pattern from 0004_storage.sql — the
-- signing client can read/write only their own folder, admins can read all.
insert into storage.buckets (id, name, public)
values ('contract-signatures', 'contract-signatures', false)
on conflict (id) do nothing;

create policy "contract signatures read own" on storage.objects
  for select using (
    bucket_id = 'contract-signatures'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "contract signatures write own" on storage.objects
  for insert with check (
    bucket_id = 'contract-signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contract signatures modify own" on storage.objects
  for update using (
    bucket_id = 'contract-signatures'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "contract signatures delete own" on storage.objects
  for delete using (
    bucket_id = 'contract-signatures'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
