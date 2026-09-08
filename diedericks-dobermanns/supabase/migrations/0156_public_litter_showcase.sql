-- 0156 — Public litter showcase: Claire × Santini, litter J, July 2026.
--
-- Apply LAST, after 0155 is live and verified. Publishing these nine sold
-- puppies before the price revoke would ship R15,000–R55,000 to the public
-- website.
--
-- Identified by litter letter, whelp month and parent names — not a UUID —
-- so the showcase litter can be changed later from the admin screen.
--
-- Previous values (4 Sep 2026):
--   Claire × Santini (J, Jul 2026): litters.is_public = false
--   its 9 living pups: dogs.is_public = false
--   Puppy 10 (deceased): left unpublished
--   14 stale public puppies in other born litters: dogs.is_public = true
--   3 expected litters: litters.is_public = true (unchanged)
--   17 public adult dogs: unchanged
--   Snapshot litters.available_count for this row before apply if you may
--   need to restore it; list pages derive "placed" from available_count = 0.
--
-- Rollback:
--   update public.litters set is_public = false
--    where litter_letter = 'J'
--      and actual_date >= date '2026-07-01'
--      and actual_date <  date '2026-08-01';
--   update public.dogs set is_public = false
--    where litter_id in (
--      select l.id from public.litters l
--       where l.litter_letter = 'J'
--         and l.actual_date >= date '2026-07-01'
--         and l.actual_date <  date '2026-08-01'
--    );
--   Restore available_count from the snapshot taken before apply.
--   The 14 stale puppy flags are not restored by that rollback; restore
--   them from a backup taken before this file if needed.

do $$
declare
  v_ids uuid[];
  v_litter_id uuid;
begin
  select array_agg(l.id)
    into v_ids
    from public.litters l
    join public.dogs dam on dam.id = l.mother_id
    join public.dogs sire on sire.id = l.father_id
   where l.litter_letter = 'J'
     and l.actual_date >= date '2026-07-01'
     and l.actual_date <  date '2026-08-01'
     and dam.name ilike '%Claire%'
     and sire.name ilike '%Santini%';

  if v_ids is null or array_length(v_ids, 1) is distinct from 1 then
    raise exception
      '0156: expected exactly one Claire × Santini J Jul 2026 litter, found %',
      coalesce(array_length(v_ids, 1), 0);
  end if;

  v_litter_id := v_ids[1];

  -- available_count = 0 so public list pages (which do not load puppies)
  -- derive "all placed" from flags, not from a hard-coded id.
  update public.litters
     set is_public = true,
         available_count = 0
   where id = v_litter_id;

  update public.dogs
     set is_public = true
   where litter_id = v_litter_id
     and status is distinct from 'deceased'
     and deceased_at is null;

  -- Never publish a deceased puppy.
  update public.dogs
     set is_public = false
   where litter_id = v_litter_id
     and (
       status = 'deceased'
       or deceased_at is not null
     );

  -- Unpublish stale public puppies in other litters. Adults (studs, dams,
  -- breeding stock, training dogs) are left untouched.
  update public.dogs
     set is_public = false
   where is_public = true
     and litter_id is not null
     and litter_id is distinct from v_litter_id
     and coalesce(category, '') not in ('adult', 'breeding_stock', 'training_dog')
     and coalesce(status, '') not in ('keep', 'stud');
end $$;
