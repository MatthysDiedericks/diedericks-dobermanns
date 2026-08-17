-- 0081 — Marketing consent evidence, lawful audiences, campaigns, public pages.
-- POPIA s69: no send-to-all. Audiences are computed. Unsubscribe is permanent
-- against imports. Nothing here sends mail by itself.

alter table public.contacts
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_in_source text,
  add column if not exists marketing_opt_out_at timestamptz;

alter table public.contacts drop constraint if exists contacts_source_check;
alter table public.contacts add constraint contacts_source_check check (
  source is null or source in (
    'manual', 'app_signup', 'enquiry', 'referral', 'import', 'dogbreederpro',
    'newsletter', 'application'
  )
);

create or replace function public.trg_contacts_marketing_opt_out_guard()
returns trigger
language plpgsql
as $$
begin
  if old.marketing_opt_out_at is not null and new.marketing_opt_in is true then
    if new.marketing_opt_in_source in (
         'application_form', 'portal_profile', 'newsletter_signup', 'quote_acceptance'
       )
       and new.marketing_opt_in_at is not null
       and (old.marketing_opt_in_at is null or new.marketing_opt_in_at > old.marketing_opt_in_at)
    then
      new.marketing_opt_out_at := null;
    else
      new.marketing_opt_in := false;
      new.marketing_opt_in_at := old.marketing_opt_in_at;
      new.marketing_opt_in_source := old.marketing_opt_in_source;
      new.marketing_opt_out_at := old.marketing_opt_out_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contacts_marketing_opt_out_guard on public.contacts;
create trigger trg_contacts_marketing_opt_out_guard
  before update on public.contacts
  for each row execute function public.trg_contacts_marketing_opt_out_guard();

create or replace function public.contact_is_customer(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.dogs d where d.owner_contact_id = p_id)
    or exists (
      select 1 from public.waiting_list w
      join public.contacts c on c.id = p_id
      where w.payment_status in ('deposit_paid', 'paid_in_full')
        and (
          (c.user_id is not null and w.client_id = c.user_id)
          or (c.email is not null and w.enquirer_email is not null
              and lower(c.email) = lower(w.enquirer_email))
        )
    )
    or exists (
      select 1 from public.reservations r
      join public.contacts c on c.id = p_id
      where r.deposit_paid = true
        and c.user_id is not null and r.client_id = c.user_id
    );
$$;

create or replace function public.marketing_audience_ids(p_audience text)
returns table(contact_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_audience not in ('customers', 'subscribers', 'both') then
    raise exception 'Audience must be customers, subscribers, or both';
  end if;
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return query
  select c.id
  from public.contacts c
  where c.merged_into_contact_id is null
    and coalesce(c.is_do_not_sell, false) = false
    and nullif(trim(c.email), '') is not null
    and (
      (p_audience in ('customers', 'both')
        and public.contact_is_customer(c.id)
        and c.marketing_opt_out_at is null)
      or
      (p_audience in ('subscribers', 'both')
        and c.marketing_opt_in = true
        and c.marketing_opt_out_at is null)
    );
end;
$$;

create or replace function public.marketing_audience_counts()
returns table(customers integer, subscribers integer, no_permission integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return query
  select
    count(*) filter (
      where public.contact_is_customer(c.id) and c.marketing_opt_out_at is null
        and coalesce(c.is_do_not_sell, false) = false
    )::integer,
    count(*) filter (
      where c.marketing_opt_in and c.marketing_opt_out_at is null
        and coalesce(c.is_do_not_sell, false) = false
        and nullif(trim(c.email), '') is not null
    )::integer,
    count(*) filter (
      where nullif(trim(c.email), '') is not null
        and coalesce(c.is_do_not_sell, false) = false
        and not (public.contact_is_customer(c.id) and c.marketing_opt_out_at is null)
        and not (c.marketing_opt_in and c.marketing_opt_out_at is null)
    )::integer
  from public.contacts c
  where c.merged_into_contact_id is null;
end;
$$;

create or replace function public.record_marketing_consent(
  p_email text,
  p_opt_in boolean,
  p_source text,
  p_full_name text default null,
  p_phone text default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_live text[] := array[
    'application_form', 'portal_profile', 'newsletter_signup', 'quote_acceptance'
  ];
begin
  if v_email = '' then raise exception 'Email is required'; end if;
  if p_source is null or not (p_source = any (v_live)) then
    raise exception 'Invalid consent source';
  end if;
  if p_source = 'portal_profile' and (auth.uid() is null or p_user_id is distinct from auth.uid()) then
    raise exception 'Not allowed';
  end if;

  select c.id into v_id
  from public.contacts c
  where c.merged_into_contact_id is null
    and ((p_user_id is not null and c.user_id = p_user_id) or lower(c.email) = v_email)
  order by (c.user_id = p_user_id) desc nulls last, c.created_at asc
  limit 1;

  if v_id is null then
    if not p_opt_in then return null; end if;
    insert into public.contacts (
      full_name, email, phone, user_id, contact_type, source,
      marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source,
      first_contact_date
    ) values (
      coalesce(nullif(trim(p_full_name), ''), 'Subscriber'),
      v_email, nullif(trim(p_phone), ''), p_user_id, 'prospect',
      case p_source
        when 'newsletter_signup' then 'newsletter'
        when 'application_form' then 'application'
        else 'manual'
      end,
      true, now(), p_source, now()
    )
    returning id into v_id;
    return v_id;
  end if;

  if p_opt_in then
    update public.contacts
       set marketing_opt_in = true,
           marketing_opt_in_at = now(),
           marketing_opt_in_source = p_source,
           marketing_opt_out_at = null,
           updated_at = now()
     where id = v_id;
  elsif p_source = 'portal_profile' then
    update public.contacts
       set marketing_opt_in = false,
           marketing_opt_out_at = now(),
           updated_at = now()
     where id = v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_my_marketing_opt_in(p_opt_in boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select u.email, p.full_name into v_email, v_name
  from auth.users u
  left join public.users p on p.id = u.id
  where u.id = v_uid;
  perform public.record_marketing_consent(
    v_email, p_opt_in, 'portal_profile', v_name, null, v_uid
  );
  update public.users set marketing_opt_in = p_opt_in where id = v_uid;
end;
$$;

create or replace function public.apply_marketing_opt_out(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contacts
     set marketing_opt_in = false,
         marketing_opt_out_at = now(),
         updated_at = now()
   where id = p_contact_id;
  update public.users u
     set marketing_opt_in = false
    from public.contacts c
   where c.id = p_contact_id and u.id = c.user_id;
end;
$$;

grant execute on function public.record_marketing_consent(text, boolean, text, text, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.set_my_marketing_opt_in(boolean) to authenticated;
grant execute on function public.apply_marketing_opt_out(uuid) to service_role;
grant execute on function public.marketing_audience_ids(text) to authenticated, service_role;
grant execute on function public.marketing_audience_counts() to authenticated, service_role;
grant execute on function public.contact_is_customer(uuid) to authenticated, service_role;
