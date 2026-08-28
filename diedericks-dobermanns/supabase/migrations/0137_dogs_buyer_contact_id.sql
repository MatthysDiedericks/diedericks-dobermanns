-- 0137 — Buyer contact on the puppy, and an audit type for the handover pack.
--
-- Buyers were matched by name string. Emails missed when the contact's name
-- differed (Lee / Leandre) or when the contact was a relative. A real FK
-- comes first; the text fields stay as fallback.
--
-- owner_id is backfilled from the contact's portal account so the pack is
-- visible after go-home. Clients without a portal user are left unset.
--
-- notifications_log_type_check must keep every type already stored (push,
-- application_reminder, …) or Postgres rejects the new constraint.

alter table public.dogs
  add column if not exists buyer_contact_id uuid references public.contacts (id) on delete set null;

create index if not exists dogs_buyer_contact_id_idx
  on public.dogs (buyer_contact_id);

comment on column public.dogs.buyer_contact_id is
  'Contact who is buying this puppy. First source for handover name and email.';

update public.dogs d
   set buyer_contact_id = c.id
  from public.contacts c
 where d.buyer_contact_id is null
   and d.owner_id is not null
   and c.user_id = d.owner_id
   and c.merged_into_contact_id is null;

update public.dogs d
   set buyer_contact_id = c.id
  from public.contacts c
 where d.buyer_contact_id is null
   and c.merged_into_contact_id is null
   and lower(trim(c.full_name)) = lower(trim(coalesce(nullif(d.reserved_for_name, ''), d.new_owner_name, '')));

-- Kennel card Lee Prinsloo / contact Leandre Prinsloo.
update public.dogs d
   set buyer_contact_id = c.id
  from public.contacts c
 where d.buyer_contact_id is null
   and c.merged_into_contact_id is null
   and lower(trim(coalesce(nullif(d.reserved_for_name, ''), d.new_owner_name, ''))) = 'lee prinsloo'
   and lower(trim(c.full_name)) = 'leandre prinsloo';

-- Kennel card Josef Kotse / contact often Josef Kotze.
update public.dogs d
   set buyer_contact_id = c.id
  from public.contacts c
 where d.buyer_contact_id is null
   and c.merged_into_contact_id is null
   and lower(trim(coalesce(nullif(d.reserved_for_name, ''), d.new_owner_name, ''))) in ('josef kotse', 'josef kotze')
   and lower(trim(c.full_name)) in ('josef kotse', 'josef kotze');

update public.dogs d
   set owner_id = c.user_id
  from public.contacts c
 where d.buyer_contact_id = c.id
   and c.user_id is not null
   and d.owner_id is null;

alter table public.notifications_log
  drop constraint if exists notifications_log_type_check;

alter table public.notifications_log
  add constraint notifications_log_type_check
  check (type = any (array[
    'push'::text,
    'email'::text,
    'whatsapp'::text,
    'application_confirmation'::text,
    'document_expiry'::text,
    'application_received'::text,
    'application_reminder'::text,
    'new_application'::text,
    'application_info_requested'::text,
    'application_approved'::text,
    'application_rejected'::text,
    'quote_sent'::text,
    'quote_accepted'::text,
    'quote_declined'::text,
    'payment_proof_uploaded'::text,
    'payment_proof_rejected'::text,
    'training_request'::text,
    'dog_birthday'::text,
    'issue_reported'::text,
    'issue_captured'::text,
    'dog_shared'::text,
    'handover_pack_sent'::text
  ]));
