-- 0122 — Match contacts on normalised email at signup. Never split a client.
-- Unique index last: 0121 cleaned the two remaining pairs first.

create or replace function public.sync_user_to_contacts()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_email text;
  v_existing public.contacts%rowtype;
begin
  select email into v_email from auth.users where id = NEW.id;

  if v_email is not null and btrim(v_email) <> '' then
    select * into v_existing
      from public.contacts
     where merged_into_contact_id is null
       and email is not null
       and lower(btrim(email)) = lower(btrim(v_email))
     order by created_at asc
     limit 1
     for update;

    if found then
      if v_existing.user_id is not null and v_existing.user_id is distinct from NEW.id then
        update public.contacts
           set notes = nullif(concat_ws(E'\n', nullif(notes, ''),
                 format(
                   'REVIEW: a second portal login (%s) tried to attach to this email at %s. Two logins, one email.',
                   NEW.id, now()::text
                 )), ''),
               updated_at = now()
         where id = v_existing.id;
        begin
          insert into public.error_events (
            code, area, severity, message, detail, surface, actor_role
          ) values (
            'CONTACT_EMAIL_HAS_OTHER_USER',
            'auth',
            'error',
            'Signup email already linked to a different portal user',
            jsonb_build_object(
              'email', lower(btrim(v_email)),
              'existing_contact_id', v_existing.id,
              'existing_user_id', v_existing.user_id,
              'incoming_user_id', NEW.id
            ),
            'server',
            'anon'
          );
        exception when others then
          null;
        end;
        return NEW;
      end if;

      update public.contacts set
        user_id = NEW.id,
        full_name = case
          when full_name is not null
            and btrim(full_name) <> ''
            and lower(full_name) not in ('app user', 'unnamed contact')
          then full_name
          else coalesce(nullif(btrim(NEW.full_name), ''), full_name)
        end,
        phone = coalesce(phone, NEW.phone),
        city = coalesce(city, NEW.city),
        country = coalesce(country, NEW.country),
        marketing_opt_in = coalesce(marketing_opt_in, false)
          or coalesce(NEW.marketing_opt_in, false),
        contact_type = case
          when contact_type = 'prospect' then 'client'
          else contact_type
        end,
        updated_at = now()
      where id = v_existing.id;
      return NEW;
    end if;
  end if;

  insert into public.contacts (
    full_name, email, phone, city, country,
    contact_type, source, user_id, marketing_opt_in,
    tags, first_contact_date, created_at, updated_at
  ) values (
    coalesce(nullif(btrim(NEW.full_name), ''), 'App User'),
    v_email,
    NEW.phone,
    NEW.city,
    NEW.country,
    'client',
    'app_signup',
    NEW.id,
    coalesce(NEW.marketing_opt_in, false),
    array['Customer'],
    now(),
    now(),
    now()
  )
  on conflict (user_id) do update set
    full_name = case
      when contacts.full_name is not null
        and btrim(contacts.full_name) <> ''
        and lower(contacts.full_name) not in ('app user', 'unnamed contact')
      then contacts.full_name
      else coalesce(nullif(btrim(excluded.full_name), ''), contacts.full_name)
    end,
    phone = coalesce(contacts.phone, excluded.phone),
    city = coalesce(contacts.city, excluded.city),
    country = coalesce(contacts.country, excluded.country),
    marketing_opt_in = coalesce(contacts.marketing_opt_in, false)
      or coalesce(excluded.marketing_opt_in, false),
    updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists trg_sync_user_to_contacts on public.users;
create trigger trg_sync_user_to_contacts
  after insert or update on public.users
  for each row execute function public.sync_user_to_contacts();

create unique index if not exists contacts_email_active_key
  on public.contacts (lower(btrim(email)))
  where email is not null and merged_into_contact_id is null;
