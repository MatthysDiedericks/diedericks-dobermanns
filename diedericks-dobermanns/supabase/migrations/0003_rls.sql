-- ============================================================================
-- Row Level Security. RLS is enabled on EVERY table — no exceptions.
-- Pattern:
--   * Public catalogue data: readable by anyone when is_public/published.
--   * Owner data: clients read/write only their own rows.
--   * Admins: full access via is_admin().
-- ============================================================================

alter table public.users enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_media enable row level security;
alter table public.litters enable row level security;
alter table public.achievements enable row level security;
alter table public.vaccinations enable row level security;
alter table public.training_logs enable row level security;
alter table public.applications enable row level security;
alter table public.enquiries enable row level security;
alter table public.reservations enable row level security;
alter table public.waiting_list enable row level security;
alter table public.contracts enable row level security;
alter table public.notifications_log enable row level security;
alter table public.testimonials enable row level security;
alter table public.gallery_items enable row level security;
alter table public.faq enable row level security;

-- users ----------------------------------------------------------------------
create policy "users read own" on public.users
  for select using (auth.uid() = id or public.is_admin());
create policy "users update own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins manage users" on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- dogs (public catalogue) ----------------------------------------------------
create policy "dogs public read" on public.dogs
  for select using (is_public = true or public.is_trainer_or_above());
create policy "dogs admin write" on public.dogs
  for all using (public.is_admin()) with check (public.is_admin());

-- dog_media ------------------------------------------------------------------
create policy "dog_media public read" on public.dog_media
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = dog_media.dog_id and (d.is_public = true or public.is_trainer_or_above())
    )
  );
create policy "dog_media admin write" on public.dog_media
  for all using (public.is_admin()) with check (public.is_admin());

-- litters --------------------------------------------------------------------
create policy "litters public read" on public.litters
  for select using (is_public = true or public.is_trainer_or_above());
create policy "litters admin write" on public.litters
  for all using (public.is_admin()) with check (public.is_admin());

-- achievements (public read where the dog is public; admins manage) ----------
create policy "achievements public read" on public.achievements
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = achievements.dog_id and (d.is_public = true or public.is_trainer_or_above())
    )
  );
create policy "achievements admin write" on public.achievements
  for all using (public.is_admin()) with check (public.is_admin());

-- vaccinations (clients see records for their reserved dogs; staff see all) ---
create policy "vaccinations read" on public.vaccinations
  for select using (
    public.is_trainer_or_above()
    or exists (
      select 1 from public.reservations r
      where r.dog_id = vaccinations.dog_id and r.client_id = auth.uid()
    )
  );
create policy "vaccinations admin write" on public.vaccinations
  for all using (public.is_admin()) with check (public.is_admin());

-- training_logs (clients see logs for their dogs; trainers/admins manage) -----
create policy "training_logs read" on public.training_logs
  for select using (
    public.is_trainer_or_above()
    or exists (
      select 1 from public.reservations r
      where r.dog_id = training_logs.dog_id and r.client_id = auth.uid()
    )
  );
create policy "training_logs staff write" on public.training_logs
  for all using (public.is_trainer_or_above()) with check (public.is_trainer_or_above());

-- applications ---------------------------------------------------------------
-- Anyone may submit (including anonymous public applicants).
create policy "applications insert" on public.applications
  for insert with check (true);
create policy "applications read own" on public.applications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "applications admin update" on public.applications
  for update using (public.is_admin()) with check (public.is_admin());
create policy "applications admin delete" on public.applications
  for delete using (public.is_admin());

-- enquiries ------------------------------------------------------------------
-- Anyone may submit a public enquiry; only admins can read/manage them.
create policy "enquiries insert" on public.enquiries
  for insert with check (true);
create policy "enquiries admin read" on public.enquiries
  for select using (public.is_admin());
create policy "enquiries admin write" on public.enquiries
  for update using (public.is_admin()) with check (public.is_admin());
create policy "enquiries admin delete" on public.enquiries
  for delete using (public.is_admin());

-- reservations ---------------------------------------------------------------
create policy "reservations read own" on public.reservations
  for select using (client_id = auth.uid() or public.is_admin());
create policy "reservations admin write" on public.reservations
  for all using (public.is_admin()) with check (public.is_admin());

-- waiting_list ---------------------------------------------------------------
create policy "waiting_list read own" on public.waiting_list
  for select using (client_id = auth.uid() or public.is_admin());
create policy "waiting_list admin write" on public.waiting_list
  for all using (public.is_admin()) with check (public.is_admin());

-- contracts ------------------------------------------------------------------
create policy "contracts read own" on public.contracts
  for select using (client_id = auth.uid() or public.is_admin());
create policy "contracts client sign" on public.contracts
  for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "contracts admin write" on public.contracts
  for all using (public.is_admin()) with check (public.is_admin());

-- notifications_log ----------------------------------------------------------
create policy "notifications read own" on public.notifications_log
  for select using (recipient_id = auth.uid() or public.is_admin());
create policy "notifications admin write" on public.notifications_log
  for all using (public.is_admin()) with check (public.is_admin());

-- testimonials (public sees approved; admins manage) -------------------------
create policy "testimonials public read" on public.testimonials
  for select using (is_approved = true or public.is_admin());
create policy "testimonials admin write" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- gallery_items --------------------------------------------------------------
create policy "gallery public read" on public.gallery_items
  for select using (true);
create policy "gallery admin write" on public.gallery_items
  for all using (public.is_admin()) with check (public.is_admin());

-- faq ------------------------------------------------------------------------
create policy "faq public read" on public.faq
  for select using (is_published = true or public.is_admin());
create policy "faq admin write" on public.faq
  for all using (public.is_admin()) with check (public.is_admin());
