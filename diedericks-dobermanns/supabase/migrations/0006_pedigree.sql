-- ============================================================================
-- Diedericks Dobermanns — Pedigree
-- Adds a structured multi-generation pedigree chart to each dog.
-- Stored as JSONB: { sire, dam, sireSire, sireDam, damSire, damDam, ... } where
-- each ancestor node is { name, titles, registration }. Self-contained so a dog
-- can carry its full ancestry even when ancestors are not kennel records.
-- The existing father_id / mother_id columns continue to link kennel dogs.
-- ============================================================================

alter table public.dogs
  add column if not exists pedigree jsonb;

comment on column public.dogs.pedigree is
  'Structured pedigree chart (up to 3 generations). Node shape: { name, titles, registration }.';
