-- 0084 — Audience query excludes merged and do-not-sell contacts.
-- Lawful basis is enforced here, not in the UI. Idempotent replace of 0081 functions.

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
