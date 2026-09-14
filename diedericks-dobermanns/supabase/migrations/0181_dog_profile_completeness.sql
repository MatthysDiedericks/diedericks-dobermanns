-- 0181_dog_profile_completeness.sql
-- Fields DogBreederPro shows that we do not hold. Ancestor Loss Coefficient
-- measures how many distinct ancestors a pedigree actually contains — a low
-- ALC means the same dogs appear repeatedly. It sits beside Wright's COI.

alter table public.dogs
  add column if not exists size_category text
    check (size_category is null or size_category in ('small','medium','large','oversize')),
  add column if not exists alc_5  numeric(5,2),
  add column if not exists alc_10 numeric(5,2);

comment on column public.dogs.alc_5  is 'Ancestor Loss Coefficient over 5 generations, percent.';
comment on column public.dogs.alc_10 is 'Ancestor Loss Coefficient over 10 generations, percent.';

notify pgrst, 'reload schema';
