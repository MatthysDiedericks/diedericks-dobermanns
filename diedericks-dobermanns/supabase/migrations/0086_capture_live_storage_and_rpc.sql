-- Capture live 18 Aug 2026 security fixes. Idempotent: already applied on production.
-- Do not revoke EXECUTE on is_admin() or is_trainer_or_above().

-- 1a. Storage: scoped document reads and inserts.
drop policy if exists "Auth read documents" on storage.objects;
create policy "Auth read documents" on storage.objects for select
using (
  bucket_id = 'documents'
  and auth.role() = 'authenticated'
  and (
        public.is_trainer_or_above()
     or (storage.foldername(name))[1] in ('dog','kennel')
     or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "Auth insert documents" on storage.objects;
create policy "Auth insert documents" on storage.objects for insert
with check (
  bucket_id = 'documents'
  and auth.role() = 'authenticated'
  and (
        public.is_trainer_or_above()
     or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 1b. RPC surface: revoke anonymous execute. Grant, never revoke, on is_admin().
revoke execute on function public.pause_audit(text)                    from public, anon;
revoke execute on function public.resume_audit()                       from public, anon;
revoke execute on function public.set_audit_change_note(text)          from public, anon;
revoke execute on function public.merge_contacts(uuid,uuid,uuid)       from public, anon;
revoke execute on function public.sweep_error_consistency()            from public, anon;
revoke execute on function public.generate_due_check_ins(integer)      from public, anon;
revoke execute on function public.refresh_dog_heat_forecast(uuid)      from public, anon;
revoke execute on function public.evaluate_pairing(uuid,uuid)          from public, anon;
grant  execute on function public.pause_audit(text), public.resume_audit(),
       public.set_audit_change_note(text), public.merge_contacts(uuid,uuid,uuid),
       public.sweep_error_consistency(), public.generate_due_check_ins(integer),
       public.refresh_dog_heat_forecast(uuid), public.evaluate_pairing(uuid,uuid)
       to authenticated, service_role;

revoke execute on function public.purge_old_audit_log()    from public, anon, authenticated;
revoke execute on function public.purge_old_error_events() from public, anon, authenticated;
grant  execute on function public.purge_old_audit_log(), public.purge_old_error_events()
       to service_role;

-- Grant, never revoke. Used inside RLS — revoking these took the site down in July.
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
