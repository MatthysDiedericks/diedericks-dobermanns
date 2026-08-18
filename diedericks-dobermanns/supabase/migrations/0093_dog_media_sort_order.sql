-- New dog_media rows must append (max + 1), never collide at 0.
-- Back-fill existing rows to 0..n-1 per dog, primary first.

create or replace function public.assign_dog_media_sort_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_max int;
  v_others int;
begin
  select count(*)::int into v_others
    from public.dog_media
   where dog_id = new.dog_id
     and (tg_op = 'INSERT' or id is distinct from new.id);

  if new.sort_order is null
     or (new.sort_order = 0 and v_others > 0) then
    select coalesce(max(sort_order), -1) into v_max
      from public.dog_media
     where dog_id = new.dog_id
       and (tg_op = 'INSERT' or id is distinct from new.id);
    new.sort_order := v_max + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dog_media_sort_order on public.dog_media;
create trigger trg_dog_media_sort_order
  before insert on public.dog_media
  for each row execute function public.assign_dog_media_sort_order();

-- Preserve visible order: primary first, then current sort_order, then uploaded_at.
do $$
declare
  r record;
begin
  for r in select distinct dog_id from public.dog_media
  loop
    update public.dog_media d
       set sort_order = s.n
      from (
        select id,
               (row_number() over (
                  order by is_primary desc, sort_order, uploaded_at, id
                ) - 1) as n
          from public.dog_media
         where dog_id = r.dog_id
      ) s
     where d.id = s.id;
  end loop;
end;
$$;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
