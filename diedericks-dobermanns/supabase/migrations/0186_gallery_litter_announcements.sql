-- 0186_gallery_litter_announcements.sql
--
-- WHY: Litter announcement posters lived on litters.announcement_image_url, a
-- bare text column with no admin field. The three posters in production were
-- placed in storage by hand. gallery_items already had the
-- litter_announcements / planned_litters categories (migration 0136) but no
-- litter_id, so a poster could not attach to a litter.
--
-- Announcements go in gallery_items with a litter_id — not in unused
-- litter_media. Three constraints make the gap unable to reopen:
--   1. One announcement per litter (partial unique index).
--   2. litters.announcement_image_url is dropped after the copy.
--   3. Public visibility is derived from litters.is_public via v_public_gallery.
--
-- security_invoker = true (the value is true, not on).

alter table public.gallery_items
  add column if not exists litter_id uuid
    references public.litters(id) on delete set null;

create index if not exists gallery_items_litter on public.gallery_items (litter_id);

-- One announcement per litter. The database decides, not the form.
create unique index if not exists gallery_items_one_announcement_per_litter
  on public.gallery_items (litter_id)
  where category = 'litter_announcements' and litter_id is not null;

-- A litter-linked category must name its litter.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_items_litter_required'
  ) then
    alter table public.gallery_items
      add constraint gallery_items_litter_required
      check (
        category not in ('litter_announcements', 'planned_litters')
        or litter_id is not null
      );
  end if;
end $$;

-- Copy existing posters from the table, not a hardcoded list.
-- Abort (and keep announcement_image_url) unless exactly three rows land.
do $$
declare
  copied integer;
  n integer;
begin
  insert into public.gallery_items (
    title,
    description,
    image_url,
    video_url,
    category,
    discipline,
    is_featured,
    sort_order,
    photo_taken_at,
    litter_id
  )
  select
    coalesce(nullif(trim(l.name), ''), 'Litter announcement'),
    null,
    l.announcement_image_url,
    null,
    'litter_announcements',
    null,
    false,
    0,
    null,
    l.id
  from public.litters l
  where l.announcement_image_url is not null
    and length(trim(l.announcement_image_url)) > 0
    and not exists (
      select 1
      from public.gallery_items g
      where g.category = 'litter_announcements'
        and g.litter_id = l.id
    );

  get diagnostics copied = row_count;

  select count(*) into n
  from public.gallery_items
  where category = 'litter_announcements'
    and litter_id is not null;

  if n <> 3 then
    raise exception
      'Expected 3 litter announcement gallery rows, found % (copied % this run). announcement_image_url not dropped.',
      n, copied;
  end if;
end $$;

alter table public.litters drop column if exists announcement_image_url;

create or replace view public.v_public_gallery
with (security_invoker = true) as
select g.*
from public.gallery_items g
left join public.litters l on l.id = g.litter_id
where g.litter_id is null or l.is_public = true;

grant select on public.v_public_gallery to anon, authenticated;

notify pgrst, 'reload schema';
