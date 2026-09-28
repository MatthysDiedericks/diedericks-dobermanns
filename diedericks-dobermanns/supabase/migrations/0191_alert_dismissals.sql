-- 0191 — On-screen expiry alerts.
--
-- documents.expiry_date was empty, so the email reminder never fired.
-- This table is only the dismissals. The alert itself is drawn in the admin
-- UI from the due-date columns that already exist. It does not send email.
--
-- Lead times live in app_settings. Documents are 30 days, not 7: a kennel
-- registration cannot be renewed inside a week. Matt can change any of them
-- under Admin → Settings.

create table if not exists public.alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_kind text not null
    check (item_kind in (
      'document', 'vaccination', 'deworming', 'contract', 'invite', 'quote', 'payable'
    )),
  item_id uuid not null,
  dismissed_until date not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_kind, item_id)
);

create index if not exists alert_dismissals_user_idx
  on public.alert_dismissals (user_id);

alter table public.alert_dismissals enable row level security;

drop policy if exists "Users read their own alert dismissals" on public.alert_dismissals;
create policy "Users read their own alert dismissals"
  on public.alert_dismissals for select
  using (user_id = auth.uid());

drop policy if exists "Users insert their own alert dismissals" on public.alert_dismissals;
create policy "Users insert their own alert dismissals"
  on public.alert_dismissals for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own alert dismissals" on public.alert_dismissals;
create policy "Users update their own alert dismissals"
  on public.alert_dismissals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete their own alert dismissals" on public.alert_dismissals;
create policy "Users delete their own alert dismissals"
  on public.alert_dismissals for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.alert_dismissals to authenticated;

insert into public.app_settings (key, value, description) values
  (
    'alert_lead_days_document',
    '30',
    'Days before a document expiry shows on the admin alert. 30, not 7 — a kennel registration cannot be renewed in a week.'
  ),
  ('alert_lead_days_vaccination', '7', 'Days before a vaccination due date shows on the admin alert.'),
  ('alert_lead_days_deworming', '7', 'Days before a deworming due date shows on the admin alert.'),
  ('alert_lead_days_contract', '3', 'Days before an e-sign link expiry shows on the admin alert.'),
  ('alert_lead_days_invite', '3', 'Days before a portal invite expiry shows on the admin alert.'),
  ('alert_lead_days_quote', '7', 'Days before a quote valid-until date shows on the admin alert.'),
  ('alert_lead_days_payable', '7', 'Days before an unpaid bill due date shows on the admin alert.')
on conflict (key) do nothing;
