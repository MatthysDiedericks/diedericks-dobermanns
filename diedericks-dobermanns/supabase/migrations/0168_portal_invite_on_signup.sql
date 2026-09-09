-- 0168 — Self-registration must write a portal_invites row at the same moment
-- the auth user (and confirmation email) is created. The invite table is
-- bookkeeping for "Clients who cannot get in"; it is not the gate.

do $$
declare r record;
begin
  for r in
    select c.conname
      from pg_constraint c
     where c.conrelid = 'public.portal_invites'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%source%'
  loop
    execute format('alter table public.portal_invites drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.portal_invites
  add constraint portal_invites_source_check
  check (source in ('application', 'waiting_list', 'client', 'member', 'registration'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'client',
    nullif(lower(btrim(coalesce(new.email, ''))), '')
  )
  on conflict (id) do nothing;

  if new.email is not null and btrim(new.email) <> ''
     and not exists (
       select 1
         from public.portal_invites i
        where i.user_id = new.id
           or lower(btrim(i.email)) = lower(btrim(new.email))
     )
  then
    insert into public.portal_invites (
      email, user_id, invited_by, source, expires_at
    ) values (
      lower(btrim(new.email)),
      new.id,
      new.id,
      'registration',
      now() + interval '7 days'
    );
  end if;

  return new;
end;
$$;
