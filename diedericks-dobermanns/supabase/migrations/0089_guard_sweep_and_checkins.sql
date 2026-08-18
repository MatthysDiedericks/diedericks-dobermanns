-- Client JWT must not run nightly jobs. Cron has no JWT claims and still runs.

create or replace function public.sweep_error_consistency()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  if coalesce(current_setting('request.jwt.claims', true), '') <> ''
     and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  for r in
    select q.id,
           q.subtotal as header_subtotal,
           coalesce(sum(qi.quantity * qi.unit_price), 0) as lines_subtotal
      from public.quotes q
      left join public.quote_items qi on qi.quote_id = q.id
     group by q.id, q.subtotal
    having abs(coalesce(q.subtotal, 0) - coalesce(sum(qi.quantity * qi.unit_price), 0)) > 0.009
     limit 50
  loop
    insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
    values (
      'QUOTE_TOTAL_MISMATCH', 'quote', 'warning',
      'Nightly sweep: quote subtotal disagrees with line sum',
      jsonb_build_object('header_subtotal', r.header_subtotal, 'lines_subtotal', r.lines_subtotal, 'source', 'nightly_sweep'),
      'server', 'system', 'quote', r.id::text
    );
    n := n + 1;
  end loop;

  for r in
    select i.id, i.total_amount, coalesce(sum(p.amount), 0) as paid
      from public.invoices i
      left join public.payments p on p.invoice_id = i.id
     group by i.id, i.total_amount
    having coalesce(sum(p.amount), 0) > coalesce(i.total_amount, 0) + 0.009
     limit 50
  loop
    insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
    values (
      'PAYMENT_OVER_ALLOCATED', 'payment', 'critical',
      'Nightly sweep: payments exceed invoice total',
      jsonb_build_object('total_amount', r.total_amount, 'paid', r.paid, 'source', 'nightly_sweep'),
      'server', 'system', 'invoice', r.id::text
    );
    n := n + 1;
  end loop;

  begin
    for r in
      select d.id, d.storage_path
        from public.documents d
       where d.storage_path is not null and d.storage_path <> ''
         and not exists (
           select 1 from storage.objects o
            where o.bucket_id = 'documents' and o.name = d.storage_path
         )
       limit 50
    loop
      insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
      values (
        'UPLOAD_OBJECT_MISSING', 'upload', 'warning',
        'Nightly sweep: documents row has no storage object',
        jsonb_build_object('storage_path', r.storage_path, 'bucket', 'documents', 'source', 'nightly_sweep'),
        'server', 'system', 'document', r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

  begin
    for r in
      select c.id, c.dog_id
        from public.check_ins c
       where c.due_date > (current_date - 30)
         and not public.dog_is_contactable(c.dog_id)
       limit 50
    loop
      insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
      values (
        'CHECKIN_NOT_CONTACTABLE', 'admin', 'warning',
        'Nightly sweep: check_in exists for non-contactable dog',
        jsonb_build_object('dog_id', r.dog_id, 'source', 'nightly_sweep'),
        'server', 'system', 'check_in', r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

  return n;
end;
$$;

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
  if coalesce(current_setting('request.jwt.claims', true), '') <> ''
     and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

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

grant execute on function public.sweep_error_consistency() to authenticated, service_role;
grant execute on function public.generate_due_check_ins(integer) to authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
