-- Birthday check-ins are a task for Matt, only when a buyer login is linked.
-- Placeholder kennel names (Puppy N / Pup N) are never used in the draft.
-- Nothing here sends a message to a client.

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
  v_ph text := '^\s*(puppy|pup)\s*[0-9]';
  v_call text; v_kennel text; v_real text;
  v_litter_label text; v_cross text; v_identity text; v_when text;
  v_bits text[];
begin
  if coalesce(current_setting('request.jwt.claims', true), '') <> ''
     and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  for r in
    select d.id as dog_id, d.name, d.call_name, d.sex, d.date_of_birth, d.placement_date,
           d.owner_id, d.owner_contact_id, d.collar_colour,
           c.full_name as contact_name,
           coalesce(nullif(c.whatsapp_number, ''), nullif(c.phone, '')) as phone,
           nullif(c.email, '') as email, mother.name as dam_name, father.name as sire_name,
           coalesce(
             nullif(btrim(l.name), ''),
             case when l.litter_letter is not null then format('Litter %s', l.litter_letter) end
           ) as litter_name
    from public.dogs d
    left join public.contacts c on c.id = d.owner_contact_id
    left join public.litters l on l.id = d.litter_id
    left join public.dogs mother on mother.id = l.mother_id
    left join public.dogs father on father.id = l.father_id
    where public.dog_is_contactable(d.id)
      and (d.owner_id is not null or d.owner_contact_id is not null)
  loop
    v_who := split_part(coalesce(r.contact_name, 'there'), ' ', 1);
    v_dog := coalesce(nullif(r.call_name, ''), r.name);
    v_pronoun := case when r.sex = 'female' then 'she' when r.sex = 'male' then 'he' else 'they' end;
    v_litter := case when r.sire_name is not null and r.dam_name is not null
      then format('%s × %s', r.sire_name, r.dam_name) else null end;

    if r.placement_date is not null
       and (r.phone is not null or r.email is not null) then
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
        -- Birthday: known portal owner only. Never by age. Never a client auto-send.
        if r.owner_id is not null then
          select exists (select 1 from public.check_ins ci where ci.dog_id = r.dog_id
            and ci.kind = 'birthday' and ci.status in ('sent', 'no_response')
            and ci.sent_at is not null and ci.sent_at > now() - interval '60 days'
            and ci.response_at is null) into v_recent;
          if not v_recent then
            v_age := extract(year from age(v_due, r.date_of_birth))::int;
            v_when := case when v_due = v_today then 'today' else 'on ' || to_char(v_due, 'DD Mon') end;
            v_call := nullif(btrim(coalesce(r.call_name, '')), '');
            v_kennel := nullif(btrim(coalesce(r.name, '')), '');
            if v_call is not null and v_call !~* v_ph then
              v_real := v_call;
            elsif v_kennel is not null and v_kennel !~* v_ph then
              v_real := v_kennel;
            else
              v_real := null;
            end if;

            if v_real is not null then
              v_draft := format(
                E'%s turns %s %s.\n\nThis is a task for you. You send any message to the owner — nothing is sent automatically.',
                v_real, v_age, v_when);
            else
              v_litter_label := r.litter_name;
              if r.sire_name is not null and r.dam_name is not null then
                v_cross := format('%s × %s', r.sire_name, r.dam_name);
                v_litter_label := case
                  when v_litter_label is not null then format('%s (%s)', v_litter_label, v_cross)
                  else v_cross
                end;
              end if;
              v_bits := array[]::text[];
              if r.sex = 'female' then v_bits := array_append(v_bits, 'Female');
              elsif r.sex = 'male' then v_bits := array_append(v_bits, 'Male');
              end if;
              if r.collar_colour is not null
                 and btrim(r.collar_colour) <> ''
                 and lower(btrim(r.collar_colour)) <> 'none' then
                v_bits := array_append(v_bits, format('%s collar', initcap(btrim(r.collar_colour))));
              end if;
              if v_litter_label is not null then
                v_bits := array_append(v_bits, v_litter_label);
              end if;
              v_identity := nullif(array_to_string(v_bits, ', '), '');
              if v_identity is null then v_identity := 'A placed dog'; end if;
              v_draft := format(
                E'%s turns %s %s. No name recorded.\n\nDo not wish them happy birthday using the kennel placeholder. Ask what they call this dog, then record it. This is a task for you — nothing is sent automatically.',
                v_identity, v_age, v_when);
            end if;

            begin
              insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
              values (r.dog_id, r.owner_contact_id, 'birthday', v_due, v_draft);
              v_inserted := v_inserted + 1;
            exception when unique_violation then null;
            end;
          end if;
        end if;

        if extract(year from age(v_due, r.date_of_birth))::int >= 2
           and (r.phone is not null or r.email is not null) then
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
  'Creates due check_in rows with draft text for Matt. Birthday only when dogs.owner_id is set, never by age, and never uses Puppy/Pup N placeholders. Never sends a client message.';

grant execute on function public.generate_due_check_ins(integer) to authenticated, service_role;
