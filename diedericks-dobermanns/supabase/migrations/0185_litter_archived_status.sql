-- 0185 — litters.status archived
--
-- A litter with puppies is history (pedigree, health, the line). The app
-- already writes status = 'archived' and hides it from working lists instead
-- of deleting. The constraint only allowed planned / expected / born / placed,
-- so archive could not land. This adds the value. No existing rows change.

alter table public.litters drop constraint if exists litters_status_check;

alter table public.litters
  add constraint litters_status_check
  check (status in ('planned', 'expected', 'born', 'placed', 'archived'));

comment on column public.litters.status is
  'planned, expected, born, placed, or archived. archived hides a litter that produced dogs without deleting it.';

notify pgrst, 'reload schema';
