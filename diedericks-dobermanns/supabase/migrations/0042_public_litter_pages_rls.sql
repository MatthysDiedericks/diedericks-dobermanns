-- Public litter pages: fill the two anon-read gaps needed to show puppies,
-- their weight history, and litter photos/videos for PUBLIC litters only.
--
-- `litters`, `dogs`, and `dog_media` already have narrow anon SELECT policies
-- gated on `is_public = true` (see 0003_rls.sql / live schema) — those are
-- left untouched. `litter_media` and `weight_logs` currently only allow
-- admins and the reserving client to read, so anon visitors get nothing.
-- These two additive policies mirror the existing `dog_media public read`
-- pattern: scoped to rows whose parent (litter or dog) is public.
--
-- NEVER widens an existing policy. Column-level safety (excluding buyer
-- names, prices, microchip numbers, admin notes) is enforced by the
-- application/site query code always using an explicit column allow-list —
-- see lib/litters/publicLitterQueries.ts — never `select('*')` on `dogs`.

create policy "Public litter media viewable for public litters" on public.litter_media
  for select using (
    exists (
      select 1 from public.litters l
      where l.id = litter_media.litter_id and l.is_public = true
    )
  );

create policy "Public weight logs viewable for public dogs" on public.weight_logs
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = weight_logs.dog_id and d.is_public = true
    )
  );
