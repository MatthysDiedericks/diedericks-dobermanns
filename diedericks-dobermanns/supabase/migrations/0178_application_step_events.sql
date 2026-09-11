-- 0178_application_step_events.sql
-- Records how far someone got in the public application form, so the drop-off
-- point can be seen. Anonymous by design: a client-generated submission id, a
-- step number, a timestamp. No name, no email, no IP, nothing identifying.
--
-- Step 0 is optional one-line feedback from someone who abandoned after
-- reaching step 2. `note` holds that text and is otherwise unused.
-- 0177 is reserved by CURSOR_PROMPT_STOP_DUPLICATE_APPLICATIONS.md.

create table if not exists public.application_step_events (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  step_number   smallint not null,
  step_name     text not null,
  occurred_at   timestamptz not null default now(),
  device        text check (device in ('mobile','tablet','desktop')),
  note          text,
  constraint application_step_events_step_ok check (
    (step_number between 1 and 6)
    or (step_number = 0 and step_name = 'feedback')
  ),
  constraint application_step_events_note_len check (
    note is null or char_length(note) <= 500
  )
);

-- One row per form, per step. Going back and forward must not inflate the count.
create unique index if not exists application_step_events_once
  on public.application_step_events (submission_id, step_number);

create index if not exists application_step_events_day
  on public.application_step_events (occurred_at);

alter table public.application_step_events enable row level security;

-- The public form must be able to write. It must never be able to read.
create policy "Anyone can record a step"
  on public.application_step_events for insert
  with check (true);

create policy "Admins read step events"
  on public.application_step_events for select
  using ((select public.is_admin()));

revoke all on public.application_step_events from anon, authenticated;
grant insert on public.application_step_events to anon, authenticated;
grant select on public.application_step_events to authenticated;

notify pgrst, 'reload schema';
