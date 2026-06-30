-- ============================================================================
-- Optional seed data for a fresh Supabase project (run via `supabase db reset`).
-- Mirrors the in-app demo content. Dog media uses placeholder URLs.
-- ============================================================================

insert into public.dogs (id, name, colour, sex, date_of_birth, status, category, bloodline, health_tested, hip_score, elbow_score, dcm_status, description, is_featured, is_public)
values
  ('11111111-1111-1111-1111-111111111111', 'Zeus vom Diedericks', 'black/rust', 'male', '2021-04-12', 'breeding_stock', 'breeding_stock', 'dominator', true, 'HD-A', 'ED-0', 'clear', 'Foundation sire of exceptional structure and nerve.', true, true),
  ('22222222-2222-2222-2222-222222222222', 'Nala vom Diedericks', 'black/rust', 'female', '2022-02-08', 'breeding_stock', 'breeding_stock', 'altobello', true, 'HD-A', 'ED-0', 'clear', 'Elegant Altobello dam with a deeply maternal character.', true, true),
  ('33333333-3333-3333-3333-333333333333', 'Titan', 'black/rust', 'male', '2024-09-01', 'available', 'training_dog', 'kennel_own', true, null, null, 'clear', 'Elite Family Protection prospect in our 6-month programme.', true, true)
on conflict (id) do nothing;

insert into public.testimonials (client_name, location, dog_name, content, is_featured, is_approved, sort_order)
values
  ('Andre M.', 'Pretoria, ZA', 'Zeus', 'The handover was world-class. A different level of breeding and training.', true, true, 0),
  ('Sarah K.', 'Cape Town, ZA', 'Nala', 'Calm in the home, switched-on when it matters. Exactly what was promised.', true, true, 1)
on conflict do nothing;

insert into public.faq (question, answer, category, sort_order)
values
  ('How do I reserve a puppy or protection dog?', 'Complete the online application. Once approved, a deposit secures your place.', 'Reservations', 0),
  ('What health testing do you perform?', 'All breeding stock is DCM tested and hip/elbow scored. Results appear on every profile.', 'Health', 1),
  ('Do you deliver internationally?', 'Yes. Elite tiers include personal delivery and a full handover.', 'Delivery', 2)
on conflict do nothing;
