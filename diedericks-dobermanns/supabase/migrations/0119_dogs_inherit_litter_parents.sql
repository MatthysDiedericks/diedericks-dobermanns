-- 0119 — A litter-born dog always inherits sire and dam from its litter
-- when those fields are null. The trigger is the only writer that cannot
-- be bypassed (forms, imports, seeds, table editor). It never overwrites
-- a value already set, never assigns a mis-sexed parent, and never sets
-- a dog as its own parent. Cycle detection stays in verification, not here.

create or replace function public.dogs_inherit_litter_parents()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sire uuid;
  v_dam uuid;
begin
  if new.litter_id is null then
    return new;
  end if;

  if new.father_id is not null and new.mother_id is not null then
    return new;
  end if;

  select l.father_id, l.mother_id
    into v_sire, v_dam
    from public.litters l
   where l.id = new.litter_id;

  if not found then
    return new;
  end if;

  if new.father_id is null
     and v_sire is not null
     and v_sire is distinct from new.id
     and exists (
       select 1 from public.dogs p
        where p.id = v_sire and p.sex = 'male'
     )
  then
    new.father_id := v_sire;
  end if;

  if new.mother_id is null
     and v_dam is not null
     and v_dam is distinct from new.id
     and exists (
       select 1 from public.dogs p
        where p.id = v_dam and p.sex = 'female'
     )
  then
    new.mother_id := v_dam;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dogs_inherit_litter_parents on public.dogs;
create trigger trg_dogs_inherit_litter_parents
  before insert or update on public.dogs
  for each row
  execute function public.dogs_inherit_litter_parents();

-- Backfill: no-op on production (already filled), correct on a fresh database.
update public.dogs d
   set father_id = coalesce(
         d.father_id,
         case when sire.id is distinct from d.id then sire.id end
       ),
       mother_id = coalesce(
         d.mother_id,
         case when dam.id is distinct from d.id then dam.id end
       )
  from public.litters l
  left join public.dogs sire
    on sire.id = l.father_id
   and sire.sex = 'male'
  left join public.dogs dam
    on dam.id = l.mother_id
   and dam.sex = 'female'
 where d.litter_id = l.id
   and (d.father_id is null or d.mother_id is null);
