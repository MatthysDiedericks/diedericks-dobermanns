-- 0124 — One matching rule: contact/application email → confirmed portal user.
-- Quotes and invoices pick it up at insert/update, not at first sign-in.
-- claim_my_records() stays the net for buyers who register later.

create or replace function public.portal_account_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  select u.id
    from auth.users u
   where p_email is not null
     and btrim(p_email) <> ''
     and lower(u.email) = lower(btrim(p_email))
     and u.email_confirmed_at is not null
   limit 1;
$$;

create or replace function public.portal_account_id_for_contact(p_contact_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.portal_account_id_for_email(c.email)
    from public.contacts c
   where c.id = p_contact_id
     and c.merged_into_contact_id is null;
$$;

revoke all on function public.portal_account_id_for_email(text) from public, anon;
revoke all on function public.portal_account_id_for_contact(uuid) from public, anon;
grant execute on function public.portal_account_id_for_email(text) to authenticated, service_role;
grant execute on function public.portal_account_id_for_contact(uuid) to authenticated, service_role;

create or replace function public.resolve_confirmed_user_id(p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return public.portal_account_id_for_email(p_email);
end;
$$;

create or replace function public.link_sale_to_portal_account()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_app_email text;
  v_quote_contact uuid;
begin
  if NEW.client_id is not null then
    return NEW;
  end if;

  if TG_TABLE_NAME = 'quotes' then
    if NEW.contact_id is not null then
      NEW.client_id := public.portal_account_id_for_contact(NEW.contact_id);
    end if;
    if NEW.client_id is null and NEW.application_id is not null then
      select email into v_app_email from public.applications where id = NEW.application_id;
      NEW.client_id := public.portal_account_id_for_email(v_app_email);
    end if;
  elsif TG_TABLE_NAME = 'invoices' then
    if NEW.quote_id is not null then
      select q.client_id, q.contact_id into NEW.client_id, v_quote_contact
        from public.quotes q where q.id = NEW.quote_id;
      if NEW.client_id is null then
        NEW.client_id := public.portal_account_id_for_contact(v_quote_contact);
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_link_quote_to_portal on public.quotes;
create trigger trg_link_quote_to_portal
  before insert or update of contact_id, client_id, application_id on public.quotes
  for each row execute function public.link_sale_to_portal_account();

drop trigger if exists trg_link_invoice_to_portal on public.invoices;
create trigger trg_link_invoice_to_portal
  before insert or update of quote_id, client_id on public.invoices
  for each row execute function public.link_sale_to_portal_account();

-- Backfill. Rows that already have client_id (Josef DD-1146) are left alone.
update public.quotes q
   set client_id = public.portal_account_id_for_contact(q.contact_id)
 where q.client_id is null
   and q.contact_id is not null
   and public.portal_account_id_for_contact(q.contact_id) is not null;

update public.quotes q
   set client_id = public.portal_account_id_for_email(a.email)
  from public.applications a
 where q.client_id is null
   and q.application_id = a.id
   and public.portal_account_id_for_email(a.email) is not null;

update public.invoices i
   set client_id = q.client_id
  from public.quotes q
 where i.quote_id = q.id
   and i.client_id is null
   and q.client_id is not null;

update public.invoices i
   set client_id = public.portal_account_id_for_contact(q.contact_id)
  from public.quotes q
 where i.quote_id = q.id
   and i.client_id is null
   and q.contact_id is not null
   and public.portal_account_id_for_contact(q.contact_id) is not null;
