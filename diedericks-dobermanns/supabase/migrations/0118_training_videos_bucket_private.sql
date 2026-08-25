-- 0118 — training-videos bucket is private. Every playback URL is signed.
-- Flipping the bucket without rewriting stored URLs is how documents broke.
-- Empty strings become null so "has a file" is a single check.

create or replace function public.training_storage_object_path(raw text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;
  v := btrim(raw);
  if v not like 'http%' then
    return v;
  end if;
  if v like '%/object/public/training-videos/%' then
    return split_part(v, '/object/public/training-videos/', 2);
  end if;
  if v like '%/object/sign/training-videos/%' then
    v := split_part(v, '/object/sign/training-videos/', 2);
    return split_part(v, '?', 1);
  end if;
  if v like '%/object/authenticated/training-videos/%' then
    return split_part(v, '/object/authenticated/training-videos/', 2);
  end if;
  return v;
end;
$$;

grant execute on function public.training_storage_object_path(text)
  to public, anon, authenticated, service_role;

update public.training_videos
   set video_url = public.training_storage_object_path(video_url),
       thumbnail_url = public.training_storage_object_path(thumbnail_url);

update storage.buckets
   set public = false
 where id = 'training-videos';

-- Anyone with SELECT on the object can mint a signed URL. Drop the
-- authenticated-wide read so paid footage cannot leak by path.
drop policy if exists "training videos authenticated read" on storage.objects;
drop policy if exists "training videos admin read" on storage.objects;

create policy "training videos admin read" on storage.objects
  for select
  using (bucket_id = 'training-videos' and public.is_admin());

-- Reaffirm write policies (idempotent).
drop policy if exists "training videos admin write" on storage.objects;
create policy "training videos admin write" on storage.objects
  for insert
  with check (bucket_id = 'training-videos' and public.is_admin());

drop policy if exists "training videos admin modify" on storage.objects;
create policy "training videos admin modify" on storage.objects
  for update
  using (bucket_id = 'training-videos' and public.is_admin());

drop policy if exists "training videos admin delete" on storage.objects;
create policy "training videos admin delete" on storage.objects
  for delete
  using (bucket_id = 'training-videos' and public.is_admin());

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
