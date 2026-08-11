-- 0062 — Owner records, welfare check-ins, owner health reports, testimonial consent.
-- (0061 is contacts_source_ref_unique; this feature ships as 0062.)
--
-- Nothing in this migration sends email, WhatsApp, or any outbound message.
-- generate_due_check_ins() only inserts status='due' rows with draft text for Matt.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Dog → historical owner (contact), placement & ownership status
-- ---------------------------------------------------------------------------
-- owner_id (auth.users) stays and keeps working — when a buyer registers,
-- claim_my_records() fills it. owner_contact_id is the CRM person who bought
-- the dog. Both can be set; they are not alternatives.
alter table public.dogs
  add column if not exists owner_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists placement_date date,
  add column if not exists ownership_status text not null default 'unknown',
  add column if not exists ownership_status_at date,
  add column if not exists ownership_notes text,
  add column if not exists do_not_contact boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dogs_ownership_status_check'
  ) then
    alter table public.dogs
      add constraint dogs_ownership_status_check
      check (ownership_status in (
        'unknown', 'with_owner', 'rehomed', 'returned', 'deceased', 'lost_contact'
      ));
  end if;
end $$;

comment on column public.dogs.owner_id is
  'Portal auth user when the buyer has an account. Independent of owner_contact_id.';
comment on column public.dogs.owner_contact_id is
  'CRM contact who owns/bought the dog. Independent of owner_id; both may be set.';
comment on column public.dogs.do_not_contact is
  'Per dog, not per person — may still contact about other dogs they have.';

create index if not exists dogs_owner_contact_id_idx
  on public.dogs(owner_contact_id)
  where owner_contact_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Check-ins (never auto-sent)
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins (
  id             uuid primary key default gen_random_uuid(),
  dog_id         uuid not null references public.dogs(id) on delete cascade,
  contact_id     uuid references public.contacts(id) on delete set null,
  kind           text not null
                   check (kind in ('post_placement', 'birthday', 'health_milestone', 'manual')),
  due_date       date not null,
  status         text not null default 'due'
                   check (status in ('due', 'sent', 'answered', 'skipped', 'no_response')),
  channel        text check (channel is null or channel in ('whatsapp', 'email', 'phone', 'in_person')),
  draft_message  text,
  sent_at        timestamptz,
  response_at    timestamptz,
  response_notes text,
  handled_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists check_ins_due_idx
  on public.check_ins(status, due_date);

create unique index if not exists check_ins_no_duplicates
  on public.check_ins(dog_id, kind, due_date)
  where status = 'due';

drop trigger if exists trg_check_ins_updated on public.check_ins;
create trigger trg_check_ins_updated
  before update on public.check_ins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Owner-reported health (distinct from certified health_tests)
-- ---------------------------------------------------------------------------
create table if not exists public.owner_health_reports (
  id                  uuid primary key default gen_random_uuid(),
  dog_id              uuid not null references public.dogs(id) on delete cascade,
  check_in_id         uuid references public.check_ins(id) on delete set null,
  reported_at         date not null default current_date,
  overall             text
                        check (overall is null or overall in (
                          'excellent', 'good', 'fair', 'poor', 'deceased'
                        )),
  weight_kg           numeric(5, 2)
                        check (weight_kg is null or (weight_kg > 0 and weight_kg < 100)),
  dcm_screened        boolean,
  dcm_result          text,
  hips_elbows         text,
  conditions          text[],
  died_at             date,
  age_at_death_months integer,
  cause_of_death      text,
  vet_practice        text,
  notes               text,
  recorded_by         uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

create index if not exists owner_health_reports_dog_idx
  on public.owner_health_reports(dog_id, reported_at);

-- Death report → mark dog deceased and cancel future due check-ins (never UI-only).
create or replace function public.trg_owner_health_report_deceased()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.overall = 'deceased' or new.died_at is not null then
    update public.dogs
       set ownership_status = 'deceased',
           ownership_status_at = coalesce(new.died_at, new.reported_at, current_date)
     where id = new.dog_id
       and ownership_status is distinct from 'deceased';

    update public.check_ins
       set status = 'skipped',
           response_notes = trim(both from coalesce(response_notes, '')
             || case when coalesce(response_notes, '') = '' then '' else E'\n' end
             || '[auto] Cancelled — dog marked deceased'),
           updated_at = now()
     where dog_id = new.dog_id
       and status = 'due';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_owner_health_report_deceased on public.owner_health_reports;
create trigger trg_owner_health_report_deceased
  after insert or update of overall, died_at
  on public.owner_health_reports
  for each row
  execute function public.trg_owner_health_report_deceased();

-- ---------------------------------------------------------------------------
-- 4. Testimonials — consent separate from Matt's approval
-- ---------------------------------------------------------------------------
alter table public.testimonials
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists dog_id uuid references public.dogs(id) on delete set null,
  add column if not exists check_in_id uuid references public.check_ins(id) on delete set null,
  add column if not exists consent_given boolean not null default false,
  add column if not exists consent_given_at timestamptz,
  add column if not exists consent_evidence text;

comment on column public.testimonials.is_approved is
  'Matt likes it / editorial approval. Not permission to publish.';
comment on column public.testimonials.consent_given is
  'Client agreed to publish. Publishing requires consent_given AND is_approved.';

-- ---------------------------------------------------------------------------
-- 5. RLS — staff read, admin write, clients: nothing on these tables
-- ---------------------------------------------------------------------------
alter table public.check_ins enable row level security;
alter table public.owner_health_reports enable row level security;

drop policy if exists "check_ins staff read" on public.check_ins;
create policy "check_ins staff read" on public.check_ins
  for select using (public.is_trainer_or_above());

drop policy if exists "check_ins admin write" on public.check_ins;
create policy "check_ins admin write" on public.check_ins
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "owner_health_reports staff read" on public.owner_health_reports;
create policy "owner_health_reports staff read" on public.owner_health_reports
  for select using (public.is_trainer_or_above());

drop policy if exists "owner_health_reports admin write" on public.owner_health_reports;
create policy "owner_health_reports admin write" on public.owner_health_reports
  for all using (public.is_admin()) with check (public.is_admin());

select public.enable_audit('check_ins');
select public.enable_audit('owner_health_reports');
select public.enable_audit('testimonials');
select public.enable_audit('dogs');

-- ---------------------------------------------------------------------------
-- 6. Generator — inserts due rows only; never sends anything
-- ---------------------------------------------------------------------------
create or replace function public.generate_due_check_ins(p_horizon_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_until date := current_date + greatest(p_horizon_days, 1);
  v_inserted integer := 0;
  r record;
  v_due date;
  v_kind text;
  v_age_years integer;
  v_draft text;
  v_pronoun text;
  v_contact_name text;
  v_dog_label text;
  v_offsets integer[] := array[7, 30, 183];
  v_off integer;
  v_has_recent boolean;
begin
  for r in
    select
      d.id as dog_id,
      d.name,
      d.call_name,
      d.sex,
      d.date_of_birth,
      d.placement_date,
      d.owner_contact_id,
      d.ownership_status,
      d.do_not_contact,
      c.full_name as contact_name,
      coalesce(nullif(c.whatsapp_number, ''), nullif(c.phone, '')) as phone,
      nullif(c.email, '') as email,
      l.actual_date as litter_date,
      mother.name as dam_name,
      father.name as sire_name
    from public.dogs d
    join public.contacts c on c.id = d.owner_contact_id
    left join public.litters l on l.id = d.litter_id
    left join public.dogs mother on mother.id = l.mother_id
    left join public.dogs father on father.id = l.father_id
    where d.do_not_contact = false
      and d.ownership_status not in ('deceased', 'lost_contact', 'returned')
      and (
        coalesce(nullif(c.whatsapp_number, ''), nullif(c.phone, '')) is not null
        or nullif(c.email, '') is not null
      )
  loop
    v_contact_name := split_part(coalesce(r.contact_name, 'there'), ' ', 1);
    v_dog_label := coalesce(nullif(r.call_name, ''), r.name);
    v_pronoun := case when r.sex = 'female' then 'she' when r.sex = 'male' then 'he' else 'they' end;

    -- post_placement: 7d, 1m, 6m after placement
    if r.placement_date is not null then
      foreach v_off in array v_offsets loop
        v_due := r.placement_date + v_off;
        if v_due between v_today and v_until then
          select exists (
            select 1 from public.check_ins ci
            where ci.dog_id = r.dog_id
              and ci.kind = 'post_placement'
              and ci.status in ('sent', 'no_response')
              and ci.sent_at is not null
              and ci.sent_at > now() - interval '60 days'
              and ci.response_at is null
          ) into v_has_recent;
          if not v_has_recent then
            v_draft := format(
              'Hi %s, just checking in on %s — it has been a little while since %s went home. How is %s settling in?',
              v_contact_name, v_dog_label, v_dog_label, v_pronoun
            );
            begin
              insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
              values (r.dog_id, r.owner_contact_id, 'post_placement', v_due, v_draft);
              v_inserted := v_inserted + 1;
            exception when unique_violation then
              null;
            end;
          end if;
        end if;
      end loop;
    end if;

    -- birthday: annually on DOB, within horizon
    if r.date_of_birth is not null then
      v_due := make_date(
        extract(year from v_today)::int,
        extract(month from r.date_of_birth)::int,
        extract(day from r.date_of_birth)::int
      );
      if v_due < v_today then
        v_due := make_date(
          extract(year from v_today)::int + 1,
          extract(month from r.date_of_birth)::int,
          extract(day from r.date_of_birth)::int
        );
      end if;
      if v_due between v_today and v_until then
        select exists (
          select 1 from public.check_ins ci
          where ci.dog_id = r.dog_id
            and ci.kind = 'birthday'
            and ci.status in ('sent', 'no_response')
            and ci.sent_at is not null
            and ci.sent_at > now() - interval '60 days'
            and ci.response_at is null
        ) into v_has_recent;
        if not v_has_recent then
          v_age_years := extract(year from age(v_due, r.date_of_birth))::int;
          v_draft := format(
            'Hi %s, %s turns %s on %s. How is %s doing?',
            v_contact_name,
            v_dog_label,
            v_age_years,
            to_char(v_due, 'DD Mon'),
            v_pronoun
          );
          begin
            insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
            values (r.dog_id, r.owner_contact_id, 'birthday', v_due, v_draft);
            v_inserted := v_inserted + 1;
          exception when unique_violation then
            null;
          end;
        end if;
      end if;

      -- health_milestone: age 2, then annually
      v_age_years := extract(year from age(v_today, r.date_of_birth))::int;
      if v_age_years >= 2 then
        v_due := make_date(
          extract(year from v_today)::int,
          extract(month from r.date_of_birth)::int,
          extract(day from r.date_of_birth)::int
        );
        -- milestone due on the birthday anniversary once they are 2+
        if v_due < v_today then
          v_due := make_date(
            extract(year from v_today)::int + 1,
            extract(month from r.date_of_birth)::int,
            extract(day from r.date_of_birth)::int
          );
        end if;
        if extract(year from age(v_due, r.date_of_birth))::int >= 2
           and v_due between v_today and v_until then
          select exists (
            select 1 from public.check_ins ci
            where ci.dog_id = r.dog_id
              and ci.kind = 'health_milestone'
              and ci.status in ('sent', 'no_response')
              and ci.sent_at is not null
              and ci.sent_at > now() - interval '60 days'
              and ci.response_at is null
          ) into v_has_recent;
          if not v_has_recent then
            v_draft := format(
              'Hi %s, %s is %s now — how has %s health been? Any DCM screening or other updates you would share?',
              v_contact_name,
              v_dog_label,
              extract(year from age(v_due, r.date_of_birth))::int,
              case when r.sex = 'female' then 'her' when r.sex = 'male' then 'his' else 'their' end
            );
            begin
              insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message)
              values (r.dog_id, r.owner_contact_id, 'health_milestone', v_due, v_draft);
              v_inserted := v_inserted + 1;
            exception when unique_violation then
              null;
            end;
          end if;
        end if;
      end if;
    end if;
  end loop;

  return v_inserted;
end;
$$;

comment on function public.generate_due_check_ins(integer) is
  'Creates due check_in rows with draft messages. Never sends any message.';

revoke all on function public.generate_due_check_ins(integer) from public;
grant execute on function public.generate_due_check_ins(integer) to authenticated;
