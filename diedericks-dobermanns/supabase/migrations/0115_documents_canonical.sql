-- 0115 — One document table. `documents` is canonical (entity_type='kennel'
-- for kennel-wide files). `kennel_documents` was a leftover dashboard table;
-- the admin page read it while the DBP import wrote to `documents`, so the
-- library showed empty while 13 files sat next door.
--
-- Copy any kennel_documents rows that are not already in documents, then drop
-- the leftover table. The `documents` storage bucket stays private.

do $$
begin
  if to_regclass('public.kennel_documents') is not null then
    insert into public.documents (
      document_name,
      original_filename,
      storage_path,
      file_type,
      category,
      entity_type,
      entity_id,
      description,
      tags,
      uploaded_by,
      uploaded_at,
      file_size_bytes,
      client_visible,
      is_public,
      requires_auth
    )
    select
      kd.name,
      kd.original_filename,
      kd.storage_path,
      case lower(coalesce(nullif(kd.file_type, ''), split_part(kd.original_filename, '.', -1)))
        when 'png' then 'png'
        when 'jpg' then 'jpg'
        when 'jpeg' then 'jpg'
        when 'docx' then 'docx'
        when 'xlsx' then 'xlsx'
        else 'pdf'
      end,
      coalesce(nullif(kd.category, ''), 'Other'),
      'kennel',
      '00000000-0000-0000-0000-000000000001',
      kd.description,
      kd.tags,
      case
        when kd.uploaded_by is not null
         and exists (select 1 from public.users u where u.id = kd.uploaded_by)
        then kd.uploaded_by
        else null
      end,
      kd.created_at,
      kd.file_size_bytes,
      false,
      false,
      true
    from public.kennel_documents kd
    where kd.storage_path is not null
      and btrim(kd.storage_path) <> ''
      and not exists (
        select 1 from public.documents d
         where d.entity_type = 'kennel'
           and (
             d.storage_path = kd.storage_path
             or d.original_filename = kd.original_filename
           )
      );

    drop table public.kennel_documents cascade;
  end if;
end $$;
