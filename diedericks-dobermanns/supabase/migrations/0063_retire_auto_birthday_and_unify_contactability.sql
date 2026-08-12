-- 0063 — Retire automatic birthday email; dog_is_contactable(); mating status in trigger.
-- Nothing here sends a message to a client.

-- 1. Stop client-facing birthday cron (leave Matt-only jobs alone)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-birthday-greetings-daily') then
    perform cron.unschedule('send-birthday-greetings-daily');
  end if;
exception when undefined_table then
  raise notice 'cron.job not available — skip unschedule';
when others then
  raise notice 'Could not unschedule send-birthday-greetings-daily: %', sqlerrm;
end $$;

drop function if exists public.trigger_birthday_greetings_check();

-- 2. deceased_at is the single death fact (do not overwrite dogs.status)
update public.dogs
   set deceased_at = coalesce(deceased_at, date_of_birth)
 where status = 'deceased' and deceased_at is null;

update public.dogs
   set ownership_notes = concat_ws(
         E'\n', nullif(ownership_notes, ''),
         'Death date unknown — back-filled from date of birth on 12 Aug 2026 during data unification.')
 where status = 'deceased'
   and deceased_at is not null and date_of_birth is not null
   and deceased_at = date_of_birth
   and coalesce(ownership_notes, '') not like '%back-filled from date of birth on 12 Aug 2026%';

update public.dogs
   set ownership_status = 'deceased',
       ownership_status_at = coalesce(ownership_status_at, deceased_at, current_date)
 where status = 'deceased' and ownership_status is distinct from 'deceased';

create or replace function public.trg_owner_health_report_deceased()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.overall = 'deceased' or new.died_at is not null then
    update public.dogs
       set ownership_status = 'deceased',
           ownership_status_at = coalesce(new.died_at, new.reported_at, current_date),
           deceased_at = coalesce(deceased_at, new.died_at, new.reported_at, current_date),
           deceased_cause = coalesce(nullif(new.cause_of_death, ''), deceased_cause)
     where id = new.dog_id;
    update public.check_ins
       set status = 'skipped',
           response_notes = trim(both from coalesce(response_notes, '')
             || case when coalesce(response_notes, '') = '' then '' else E'\n' end
             || '[auto] Cancelled — dog marked deceased'),
           updated_at = now()
     where dog_id = new.dog_id and status = 'due';
  end if;
  return new;
end;
$$;

-- 3. One predicate — default false. Do NOT revoke PUBLIC execute.
create or replace function public.dog_is_contactable(p_dog_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select not d.do_not_contact
        and d.deceased_at is null
        and d.status <> 'deceased'
        and coalesce(d.ownership_status, 'unknown')
              not in ('deceased', 'lost_contact', 'returned')
       from public.dogs d where d.id = p_dog_id),
    false);
$$;

comment on function public.dog_is_contactable(uuid) is
  'True only when contacting about this dog is appropriate. Unknown id → false.';

grant execute on function public.dog_is_contactable(uuid) to authenticated, service_role;

-- 4. Mating status sync in trigger (not UI-only)
create or replace function public.sync_heat_cycle_from_matings()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cycle_id uuid;
  v_first record;
  v_count integer;
  v_status text;
begin
  v_cycle_id := coalesce(new.heat_cycle_id, old.heat_cycle_id);
  select m.mated_at, m.sire_id, m.mating_type into v_first
  from public.matings m where m.heat_cycle_id = v_cycle_id
  order by m.mated_at asc limit 1;

  if found then
    update public.heat_cycles
       set mating_date = (v_first.mated_at at time zone 'UTC')::date,
           sire_id = v_first.sire_id, mating_type = v_first.mating_type, updated_at = now()
     where id = v_cycle_id;
    update public.heat_cycles set status = 'mated', updated_at = now()
     where id = v_cycle_id and status in ('in_heat', 'active');
  else
    update public.heat_cycles
       set mating_date = null, sire_id = null, mating_type = null, updated_at = now()
     where id = v_cycle_id;
    select count(*) into v_count from public.matings where heat_cycle_id = v_cycle_id;
    select status into v_status from public.heat_cycles where id = v_cycle_id;
    if coalesce(v_count, 0) = 0 and v_status = 'mated' then
      update public.heat_cycles set status = 'in_heat', updated_at = now()
       where id = v_cycle_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

-- 5. Generator: dog_is_contactable + retired email tone for birthday drafts
create or replace function public.generate_due_check_ins(p_horizon_days integer default 14)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_today date := current_date;
  v_until date := current_date + greatest(p_horizon_days, 1);
  v_inserted integer := 0;
  r record; v_due date; v_age integer; v_draft text; v_pronoun text;
  v_who text; v_dog text; v_litter text; v_off integer;
  v_offsets integer[] := array[7, 30, 183];
  v_recent boolean;
begin
  for r in
    select d.id as dog_id, d.name, d.call_name, d.sex, d.date_of_birth, d.placement_date,
           d.owner_contact_id, c.full_name as contact_name,
           coalesce(nullif(c.whatsapp_number, ''), nullif(c.phone, '')) as phone,
           nullif(c.email, '') as email, mother.name as dam_name, father.name as sire_name
    from public.dogs d
    join public.contacts c on c.id = d.owner_contact_id
    left join public.litters l on l.id = d.litter_id
    left join public.dogs mother on mother.id = l.mother_id
    left join public.dogs father on father.id = l.father_id
    where public.dog_is_contactable(d.id)
      and (coalesce(nullif(c.whatsapp_number, ''), nullif(c.phone, '')) is not null
           or nullif(c.email, '') is not null)
  loop
    v_who := split_part(coalesce(r.contact_name, 'there'), ' ', 1);
    v_dog := coalesce(nullif(r.call_name, ''), r.name);
    v_pronoun := case when r.sex = 'female' then 'she' when r.sex = 'male' then 'he' else 'they' end;
    v_litter := case when r.sire_name is not null and r.dam_name is not null
      then format('%s × %s', r.sire_name, r.dam_name) else null end;

    if r.placement_date is not null then
      foreach v_off in array v_offsets loop
        v_due := r.placement_date + v_off;
        if v_due between v_today and v_until then
          select exists (select 1 from public.check_ins ci where ci.dog_id = r.dog_id
            and ci.kind = 'post_placement' and ci.status in ('sent', 'no_response')
            and ci.sent_at is not null and ci.sent_at > now() - interval '60 days'
            and ci.response_at is null) into v_recent;
          if not v_recent then
            v_draft := format('Hi %s, just checking in on %s — it has been a little while since %s went home. How is %s settling in?',
              v_who, v_dog, v_dog, v_pronoun);
            begin
              insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
              values (r.dog_id, r.owner_contact_id, 'post_placement', v_due, v_draft);
              v_inserted := v_inserted + 1;
            exception when unique_violation then null;
            end;
          end if;
        end if;
      end loop;
    end if;

    if r.date_of_birth is not null then
      begin
        v_due := make_date(extract(year from v_today)::int,
          extract(month from r.date_of_birth)::int, extract(day from r.date_of_birth)::int);
        if v_due < v_today then
          v_due := make_date(extract(year from v_today)::int + 1,
            extract(month from r.date_of_birth)::int, extract(day from r.date_of_birth)::int);
        end if;
      exception when others then v_due := null;
      end;

      if v_due is not null and v_due between v_today and v_until then
        select exists (select 1 from public.check_ins ci where ci.dog_id = r.dog_id
          and ci.kind = 'birthday' and ci.status in ('sent', 'no_response')
          and ci.sent_at is not null and ci.sent_at > now() - interval '60 days'
          and ci.response_at is null) into v_recent;
        if not v_recent then
          v_age := extract(year from age(v_due, r.date_of_birth))::int;
          v_draft := format(
            'Hi %s, %s turns %s on %s%s. We remember every dog we breed — hope the year ahead is a good one for both of you. How is %s doing?',
            v_who, v_dog, v_age, to_char(v_due, 'DD Mon'),
            case when v_litter is not null then format(' (%s)', v_litter) else '' end, v_pronoun);
          begin
            insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
            values (r.dog_id, r.owner_contact_id, 'birthday', v_due, v_draft);
            v_inserted := v_inserted + 1;
          exception when unique_violation then null;
          end;
        end if;

        if extract(year from age(v_due, r.date_of_birth))::int >= 2 then
          select exists (select 1 from public.check_ins ci where ci.dog_id = r.dog_id
            and ci.kind = 'health_milestone' and ci.status in ('sent', 'no_response')
            and ci.sent_at is not null and ci.sent_at > now() - interval '60 days'
            and ci.response_at is null) into v_recent;
          if not v_recent then
            v_draft := format(
              'Hi %s, %s is %s now — how has %s health been? Any DCM screening or other updates you would share?',
              v_who, v_dog, extract(year from age(v_due, r.date_of_birth))::int,
              case when r.sex = 'female' then 'her' when r.sex = 'male' then 'his' else 'their' end);
            begin
              insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
              values (r.dog_id, r.owner_contact_id, 'health_milestone', v_due, v_draft);
              v_inserted := v_inserted + 1;
            exception when unique_violation then null;
            end;
          end if;
        end if;
      end if;
    end if;
  end loop;
  return v_inserted;
end;
$$;

comment on function public.generate_due_check_ins(integer) is
  'Creates due check_in rows with drafts. Uses dog_is_contactable(). Never sends.';
