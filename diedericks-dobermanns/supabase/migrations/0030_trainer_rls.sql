-- Trainer portal: allow trainers to update their assigned bookings and upload session photos.

-- Trainers can update notes + status on bookings assigned to them.
create policy "trainers_update_own_bookings" on public.training_bookings
  for update using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Trainers may insert dog_media for dogs on their assigned bookings.
create policy "dog_media trainer insert" on public.dog_media
  for insert with check (
    exists (
      select 1 from public.training_bookings b
      where b.dog_id = dog_media.dog_id
        and b.trainer_id = auth.uid()
    )
  );

-- Trainers may upload post-session media on their bookings.
create policy "booking media trainer write" on public.training_booking_media
  for insert with check (
    exists (
      select 1 from public.training_bookings b
      where b.id = training_booking_media.booking_id
        and b.trainer_id = auth.uid()
    )
  );
