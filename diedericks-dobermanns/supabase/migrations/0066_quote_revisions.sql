-- 0066 — Quote revisions: append-only snapshots of what a client was actually sent.
-- Snapshot on send (and resend), never on every draft edit.

-- ---------------------------------------------------------------------------
-- Quotes header columns
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists revision integer not null default 1,
  add column if not exists last_sent_revision integer,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id),
  add column if not exists reopen_reason text,
  add column if not exists last_edit_note text;

comment on column public.quotes.revision is
  'Current working revision number. Bumps on resend after a prior send.';
comment on column public.quotes.last_sent_revision is
  'Revision number of the PDF last emailed to the client.';
comment on column public.quotes.last_edit_note is
  'Admin note for the latest edit — surfaces in trg_audit via the quotes UPDATE.';

-- ---------------------------------------------------------------------------
-- quote_revisions — append-only history of sent versions
-- ---------------------------------------------------------------------------
create table if not exists public.quote_revisions (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  revision      integer not null,
  snapshot      jsonb not null,
  subtotal      numeric not null,
  discount      numeric not null default 0,
  total         numeric not null,
  sent_at       timestamptz,
  sent_to       text,
  change_note   text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create unique index if not exists quote_revisions_key
  on public.quote_revisions(quote_id, revision);
create index if not exists quote_revisions_quote_idx
  on public.quote_revisions(quote_id, revision desc);

comment on table public.quote_revisions is
  'Versions a client actually received. Append-only — no update/delete policies.';

-- ---------------------------------------------------------------------------
-- RLS — admin insert/select; clients read own via client_owns_quote; no mutate
-- ---------------------------------------------------------------------------
alter table public.quote_revisions enable row level security;

drop policy if exists quote_revisions_select_admin on public.quote_revisions;
create policy quote_revisions_select_admin on public.quote_revisions
  for select to authenticated
  using (public.is_admin());

drop policy if exists quote_revisions_select_own on public.quote_revisions;
create policy quote_revisions_select_own on public.quote_revisions
  for select to authenticated
  using (public.client_owns_quote(quote_id));

drop policy if exists quote_revisions_insert_admin on public.quote_revisions;
create policy quote_revisions_insert_admin on public.quote_revisions
  for insert to authenticated
  with check (public.is_admin());

-- Intentionally no UPDATE or DELETE policies for anyone.

grant select, insert on public.quote_revisions to authenticated;

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
select public.enable_audit('quote_revisions');

-- Session GUC for trg_audit consumers / future enrichment. Safe no-op if unused.
create or replace function public.set_audit_change_note(p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.audit_change_note', coalesce(p_note, ''), true);
end;
$$;

-- Do not revoke EXECUTE from PUBLIC — policies and PostgREST rely on default grants.
grant execute on function public.set_audit_change_note(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: every already-sent quote becomes revision 1 from current rows,
-- so editing DD-1135 (etc.) cannot erase what was in the inbox last night.
-- ---------------------------------------------------------------------------
insert into public.quote_revisions (
  quote_id, revision, snapshot, subtotal, discount, total,
  sent_at, sent_to, change_note, created_by
)
select
  q.id,
  coalesce(q.revision, 1),
  jsonb_build_object(
    'quote_number', q.quote_number,
    'revision', coalesce(q.revision, 1),
    'status', q.status,
    'currency', q.currency,
    'subtotal', q.subtotal,
    'discount', q.discount,
    'total', q.total,
    'notes', q.notes,
    'valid_until', q.valid_until,
    'client_id', q.client_id,
    'historical_client_name', q.historical_client_name,
    'application_id', q.application_id,
    'sent_at', q.sent_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item_type', qi.item_type,
          'dog_id', qi.dog_id,
          'description', qi.description,
          'quantity', qi.quantity,
          'unit_price', qi.unit_price,
          'line_total', qi.line_total,
          'sort_order', qi.sort_order
        )
        order by qi.sort_order
      )
      from public.quote_items qi
      where qi.quote_id = q.id
    ), '[]'::jsonb)
  ),
  q.subtotal,
  coalesce(q.discount, 0),
  q.total,
  q.sent_at,
  null,
  'Backfilled from live quote at migration 0066.',
  q.created_by
from public.quotes q
where q.sent_at is not null
  and not exists (
    select 1 from public.quote_revisions r where r.quote_id = q.id
  );

update public.quotes q
set last_sent_revision = coalesce(q.revision, 1)
where q.sent_at is not null
  and q.last_sent_revision is null;
