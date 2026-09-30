-- 0199 — Link an invoice to a contact, and record what happened when
-- amount_paid was set with no payment rows behind it.
--
-- client_id is a portal user. Historical buyers often have no user row, so an
-- invoice needs its own contact_id. Nothing in this migration fills that
-- column from a name.
--
-- A review note does not change amount_paid. Zeroing an undocumented payment
-- would invent a debt.

alter table public.invoices
  add column if not exists contact_id uuid references public.contacts(id);

comment on column public.invoices.contact_id is
  'Contact this invoice belongs to. Not a portal user. Set only when a person confirms the link — never from a name match.';

create index if not exists invoices_contact_id_idx
  on public.invoices (contact_id);

create table if not exists public.invoice_payment_gap_reviews (
  invoice_id uuid primary key references public.invoices(id) on delete cascade,
  resolution text not null check (resolution in ('explained', 'payment_recorded')),
  note text not null check (char_length(btrim(note)) >= 8),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz not null default now()
);

comment on table public.invoice_payment_gap_reviews is
  'What a person said about an invoice whose amount_paid had no payment rows. Does not change amount_paid.';

alter table public.invoice_payment_gap_reviews enable row level security;

drop policy if exists "invoice_payment_gap_reviews_admin" on public.invoice_payment_gap_reviews;
create policy "invoice_payment_gap_reviews_admin" on public.invoice_payment_gap_reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Invoice 1087 already has its R10 000 deposit. This records that the gap is
-- closed. It does not insert a payment.
insert into public.invoice_payment_gap_reviews (invoice_id, resolution, note, reviewed_at)
select i.id,
       'payment_recorded',
       'R10 000 deposit on 9 Jun 2026, EFT, is the only payment. R45 000 is still outstanding. Matt confirmed this on 29 Sep 2026.',
       '2026-09-29T12:00:00Z'
from public.invoices i
where i.invoice_number = '1087'
  and exists (
    select 1 from public.invoice_payments p where p.invoice_id = i.id
  )
on conflict (invoice_id) do nothing;

notify pgrst, 'reload schema';
