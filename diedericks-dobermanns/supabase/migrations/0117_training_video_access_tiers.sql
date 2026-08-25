-- 0117 — Training library access: public / owner / paid on one column.
-- Old values `free` and `bundle` stay accepted for one release so a
-- half-deployed app does not blank the library.
-- Do not revoke EXECUTE on RLS helpers.

-- ---------------------------------------------------------------------------
-- Helpers (GRANT, never revoke — used inside RLS)
-- ---------------------------------------------------------------------------

create or replace function public.training_video_has_file(p_url text)
returns boolean
language sql
immutable
as $$
  select p_url is not null and length(btrim(p_url)) > 0;
$$;

create or replace function public.training_video_tier(p_tier text)
returns text
language sql
immutable
as $$
  select case
    when p_tier in ('public', 'free') then 'public'
    when p_tier = 'owner' then 'owner'
    when p_tier in ('paid', 'bundle') then 'paid'
    else coalesce(p_tier, 'public')
  end;
$$;

-- Owner is earned by holding a dog: owner_id, waitlist allocation, or a
-- confirmed/completed reservation (sale). A portal login alone is not enough.
create or replace function public.client_owns_a_dog()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dogs d
     where d.owner_id = auth.uid()
    union
    select 1 from public.reservations r
     where r.client_id = auth.uid()
       and r.dog_id is not null
       and r.status in ('confirmed', 'completed')
    union
    select 1 from public.waiting_list w
     where w.client_id = auth.uid()
       and w.assigned_dog_id is not null
  );
$$;

-- THE paid unlock path. One function. A future checkout inserts into
-- video_bundle_purchases and this starts returning true — no other caller.
create or replace function public.client_has_bundle_access(p_bundle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_bundle_id is not null
     and (
       public.is_admin()
       or exists (
         select 1 from public.video_bundle_purchases p
          where p.bundle_id = p_bundle_id
            and p.client_id = auth.uid()
       )
     );
$$;

create or replace function public.client_can_watch_training_video(p_video_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_bundle uuid;
  v_url text;
  v_active boolean;
begin
  if public.is_admin() or public.is_trainer_or_above() then
    return true;
  end if;

  select tv.access_tier, tv.bundle_id, tv.video_url, tv.is_active
    into v_tier, v_bundle, v_url, v_active
    from public.training_videos tv
   where tv.id = p_video_id;

  if not found then
    return false;
  end if;
  if v_active is not true then
    return false;
  end if;
  if not public.training_video_has_file(v_url) then
    return false;
  end if;

  case public.training_video_tier(v_tier)
    when 'public' then
      return true;
    when 'owner' then
      return public.client_owns_a_dog();
    when 'paid' then
      return public.client_has_bundle_access(v_bundle);
    else
      return false;
  end case;
end;
$$;

create or replace function public.training_owner_client_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from (
    select d.owner_id as uid from public.dogs d where d.owner_id is not null
    union
    select r.client_id from public.reservations r
     where r.client_id is not null
       and r.dog_id is not null
       and r.status in ('confirmed', 'completed')
    union
    select w.client_id from public.waiting_list w
     where w.client_id is not null
       and w.assigned_dog_id is not null
  ) s;
$$;

create or replace function public.log_training_tier_change(
  p_video_ids uuid[],
  p_from text,
  p_to text,
  p_category_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_email text;
  v_role text;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_actor := auth.uid();
  select u.email, u.role into v_email, v_role
    from public.users u where u.id = v_actor;

  foreach v_id in array p_video_ids loop
    insert into public.audit_log (
      table_name, record_id, action, actor_id, actor_email, actor_role,
      changed_fields, old_values, new_values
    ) values (
      'training_videos',
      v_id::text,
      'update',
      v_actor,
      v_email,
      v_role,
      array['access_tier'],
      jsonb_build_object('access_tier', p_from),
      jsonb_build_object(
        'access_tier', p_to,
        'category_id', p_category_id,
        'bulk', coalesce(array_length(p_video_ids, 1), 0) > 1
      )
    );
  end loop;
end;
$$;

grant execute on function public.training_video_has_file(text) to public, anon, authenticated, service_role;
grant execute on function public.training_video_tier(text) to public, anon, authenticated, service_role;
grant execute on function public.client_owns_a_dog() to public, anon, authenticated, service_role;
grant execute on function public.client_has_bundle_access(uuid) to public, anon, authenticated, service_role;
grant execute on function public.client_can_watch_training_video(uuid) to public, anon, authenticated, service_role;
grant execute on function public.training_owner_client_count() to authenticated, service_role;
grant execute on function public.log_training_tier_change(uuid[], text, text, uuid) to authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Column: keep old values accepted; migrate live rows
-- ---------------------------------------------------------------------------

alter table public.training_videos drop constraint if exists training_videos_access_tier_check;

alter table public.training_videos
  add constraint training_videos_access_tier_check
  check (access_tier in ('public', 'owner', 'paid', 'free', 'bundle', 'admin'));

alter table public.training_videos alter column access_tier set default 'owner';

update public.training_videos set access_tier = 'public' where access_tier = 'free';
update public.training_videos set access_tier = 'paid' where access_tier = 'bundle';

-- ---------------------------------------------------------------------------
-- RLS: listing is not the same as playback. Paid videos are visible (locked)
-- to dog-owning clients. Playback is client_can_watch_training_video().
-- A row with no file never reaches a client, regardless of tier.
-- ---------------------------------------------------------------------------

drop policy if exists "videos_read" on public.training_videos;

create policy "training_videos_select" on public.training_videos
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or public.is_trainer_or_above()
    or (
      is_active = true
      and public.training_video_has_file(video_url)
      and (
        public.training_video_tier(access_tier) = 'public'
        or (
          public.training_video_tier(access_tier) in ('owner', 'paid')
          and public.client_owns_a_dog()
        )
      )
    )
  );

drop policy if exists "video_categories_read" on public.training_video_categories;

create policy "training_video_categories_select" on public.training_video_categories
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin() or public.is_trainer_or_above());

drop policy if exists "video_bundles_read" on public.video_bundles;

create policy "video_bundles_select" on public.video_bundles
  for select
  to authenticated
  using (is_active = true or public.is_admin() or public.is_trainer_or_above());
