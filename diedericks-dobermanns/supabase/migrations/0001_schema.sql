-- ============================================================================
-- Diedericks Dobermanns — Core schema
-- Source of truth: the live Supabase project (mirrors types/database.types.ts).
-- All tables use UUID primary keys. RLS is enabled in 0003_rls.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Keeps updated_at fresh on row updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- users (extends auth.users) -------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  country text,
  city text,
  role text not null default 'client'
    check (role in ('visitor', 'client', 'trainer', 'admin', 'super_admin')),
  avatar_url text,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- dogs -----------------------------------------------------------------------
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  breed text not null default 'Dobermann',
  colour text check (colour in ('black/rust', 'blue/rust', 'fawn/rust', 'red/rust')),
  sex text check (sex in ('male', 'female')),
  date_of_birth date,
  father_id uuid references public.dogs (id) on delete set null,
  mother_id uuid references public.dogs (id) on delete set null,
  microchip_number text unique,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold', 'in_training', 'breeding_stock', 'deceased')),
  category text not null default 'puppy'
    check (category in ('puppy', 'adult', 'breeding_stock', 'training_dog')),
  price decimal(12, 2),
  bloodline text check (bloodline in ('altobello', 'dominator', 'quantum', 'american', 'kennel_own')),
  health_tested boolean not null default false,
  hip_score text,
  elbow_score text,
  dcm_status text check (dcm_status in ('clear', 'carrier', 'affected')),
  pedigree_url text,
  description text,
  temperament_notes text,
  training_notes text,
  is_featured boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- dog_media ------------------------------------------------------------------
create table if not exists public.dog_media (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  url text not null,
  thumbnail_url text,
  caption text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  uploaded_at timestamptz not null default now()
);

-- litters --------------------------------------------------------------------
create table if not exists public.litters (
  id uuid primary key default gen_random_uuid(),
  name text,
  mother_id uuid references public.dogs (id) on delete set null,
  father_id uuid references public.dogs (id) on delete set null,
  expected_date date,
  actual_date date,
  puppy_count int,
  available_count int,
  description text,
  status text not null default 'planned'
    check (status in ('planned', 'expected', 'born', 'placed')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- achievements (titles / competition results, tied to a dog) -----------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  title text not null,
  trial_date date,
  location text,
  judge text,
  score text,
  notes text,
  created_at timestamptz not null default now()
);

-- vaccinations ---------------------------------------------------------------
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  vaccine_name text not null,
  date_administered date not null,
  next_due_date date,
  administered_by text,
  batch_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- training_logs --------------------------------------------------------------
create table if not exists public.training_logs (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  trainer_id uuid references public.users (id) on delete set null,
  training_type text not null
    check (training_type in ('obedience', 'protection', 'psa', 'socialization', 'foundation')),
  session_date date not null,
  duration_minutes int,
  milestone text,
  progress_level text check (progress_level in ('foundation', 'intermediate', 'advanced', 'proofed')),
  notes text,
  video_url text,
  created_at timestamptz not null default now()
);

-- applications ---------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  id_number text,
  country text not null,
  province text,
  city text,
  address text,
  dog_interest text check (dog_interest in ('puppy', 'elite_developed', 'protection_dog')),
  specific_dog_id uuid references public.dogs (id) on delete set null,
  litter_interest_id uuid references public.litters (id) on delete set null,
  purpose text check (purpose in ('family', 'protection', 'sport', 'companion')),
  experience_with_dobermanns text,
  current_pets text,
  home_type text check (home_type in ('house', 'apartment', 'smallholding', 'farm')),
  has_secure_yard boolean,
  children_ages text,
  security_requirements text,
  vet_name text,
  vet_phone text,
  personal_reference_name text,
  personal_reference_phone text,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected', 'waitlisted')),
  admin_notes text,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  agreed_to_terms boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enquiries (public contact / dog enquiry form) ------------------------------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  dog_id uuid references public.dogs (id) on delete set null,
  country text,
  status text not null default 'new'
    check (status in ('new', 'replied', 'closed')),
  admin_notes text,
  replied_by uuid references public.users (id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- reservations ---------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  litter_id uuid references public.litters (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  deposit_paid boolean not null default false,
  deposit_amount decimal(12, 2),
  total_price decimal(12, 2),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  expected_pickup_date date,
  actual_pickup_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- waiting_list ---------------------------------------------------------------
create table if not exists public.waiting_list (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  litter_id uuid references public.litters (id) on delete cascade,
  preference_notes text,
  position int,
  status text not null default 'active'
    check (status in ('active', 'offered', 'converted', 'removed')),
  created_at timestamptz not null default now()
);

-- contracts ------------------------------------------------------------------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations (id) on delete set null,
  client_id uuid not null references public.users (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  document_url text not null,
  signed_by_client boolean not null default false,
  signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- notifications_log ----------------------------------------------------------
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.users (id) on delete cascade,
  type text not null check (type in ('push', 'email', 'whatsapp')),
  subject text,
  body text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'failed')),
  sent_at timestamptz not null default now()
);

-- testimonials ---------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  location text,
  dog_name text,
  content text not null,
  video_url text,
  photo_url text,
  is_featured boolean not null default false,
  is_approved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- gallery_items --------------------------------------------------------------
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  image_url text,
  video_url text,
  category text check (category in ('puppies', 'training', 'competition', 'family', 'kennel')),
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- faq ------------------------------------------------------------------------
create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- updated_at triggers --------------------------------------------------------
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_dogs_updated before update on public.dogs
  for each row execute function public.set_updated_at();
create trigger trg_litters_updated before update on public.litters
  for each row execute function public.set_updated_at();
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();
create trigger trg_reservations_updated before update on public.reservations
  for each row execute function public.set_updated_at();

-- Helpful indexes
create index if not exists idx_dog_media_dog_id on public.dog_media (dog_id);
create index if not exists idx_dogs_status on public.dogs (status);
create index if not exists idx_dogs_category on public.dogs (category);
create index if not exists idx_achievements_dog on public.achievements (dog_id);
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_enquiries_status on public.enquiries (status);
create index if not exists idx_reservations_client on public.reservations (client_id);
create index if not exists idx_vaccinations_dog on public.vaccinations (dog_id);
create index if not exists idx_training_logs_dog on public.training_logs (dog_id);
