-- 0077 — A quote line is a specific puppy, a place in a future litter,
-- or a priced puppy whose litter is not yet decided.
--
-- subject_kind must match the attached ids so a line cannot claim a
-- specific puppy while pointing at nothing. Litter / unallocated lines
-- cannot carry a dog_id, which makes reserving a non-existent puppy
-- structurally impossible.

alter table public.quote_items
  add column if not exists litter_id uuid references public.litters(id) on delete set null,
  add column if not exists subject_kind text not null default 'unallocated';

alter table public.quote_items
  drop constraint if exists quote_items_subject_kind_check;

alter table public.quote_items
  add constraint quote_items_subject_kind_check
  check (subject_kind in ('dog', 'litter', 'unallocated'));

update public.quote_items
   set subject_kind = 'dog'
 where dog_id is not null
   and subject_kind is distinct from 'dog';

create index if not exists quote_items_litter_id_idx
  on public.quote_items(litter_id) where litter_id is not null;

alter table public.quote_items
  drop constraint if exists quote_items_subject_consistent;

alter table public.quote_items
  add constraint quote_items_subject_consistent check (
    (subject_kind = 'dog'         and dog_id is not null) or
    (subject_kind = 'litter'      and litter_id is not null and dog_id is null) or
    (subject_kind = 'unallocated' and dog_id is null and litter_id is null)
  );

comment on column public.quote_items.subject_kind is
  'What is being sold: a specific puppy, a place in a named litter, or a priced puppy whose litter is still open.';

comment on column public.quote_items.litter_id is
  'Set when subject_kind is litter (a place in that litter). May also remain set after the line is resolved to a dog.';
