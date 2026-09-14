# Cursor Prompt — Find out where applicants give up

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` (the public form) and `diedericks-dobermanns` (admin view — see Task 4).
3. Migration number: `0177` is reserved by `CURSOR_PROMPT_STOP_DUPLICATE_APPLICATIONS.md`, so this is **0178**. Byte-identical in both folders.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## The problem, measured on 11 September 2026

Over the previous two weeks the public application form was viewed about **560 times** and produced **6 applications**. Roughly **one in fifty**.

| Day | `/apply` views | Applications |
|---|---|---|
| 1 Sep | 106 | **0** |
| 4 Sep | 43 | **0** |
| 8 Sep | 35 | **0** |
| 9 Sep | 46 | **0** |
| 10 Sep | 79 | 2 |

The traffic is real and it is the right traffic — these are people who clicked through to apply for a Dobermann. Something in a six-step form asking for an ID number, a physical address, veterinary details and personal references is losing 98% of them.

**Nobody knows which step.** That is the entire problem. Fix the measurement first; do not guess at the form.

---

## Task 1 — Migration 0178

```sql
-- 0178_application_step_events.sql
-- Records how far someone got in the public application form, so the drop-off
-- point can be seen. Anonymous by design: a client-generated submission id, a
-- step number, a timestamp. No name, no email, no IP, nothing identifying.

create table if not exists public.application_step_events (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  step_number   smallint not null check (step_number between 1 and 6),
  step_name     text not null,
  occurred_at   timestamptz not null default now(),
  device        text check (device in ('mobile','tablet','desktop'))
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
```

**Insert-only for the public.** A visitor can add a row and can never read one. Get this backwards and you have published a list of everyone part-way through an application.

---

## Task 2 — Fire the event

In the application form:

- Reuse the **same `submission_id`** the form already generates once per mount for duplicate protection. That way a completed application can be joined back to its own step trail.
- Fire **once, when a step is first reached** — not on keystrokes, not on every render, not on going back. The unique index will reject duplicates; catch that quietly and carry on. A failed tracking write must **never** block or slow the form.
- Send `device` from the viewport width: under 768 `mobile`, under 1024 `tablet`, otherwise `desktop`.
- `step_name` is the label the applicant actually sees — `Personal`, `Your home`, `Experience`, `Puppy`, `Legal`, `Review`.

Wrap the whole thing in try/catch and let it fail silently. **Analytics must never be able to break a form.** That principle is the reason this project lost two days of applications in September.

---

## Task 3 — Record the reason, not just the fact

A drop-off count tells you *where*. It does not tell you *why*. Add one thing that does:

When someone abandons after reaching step 2 or later, on the next visit show a single dismissible line at the top of the form:

> You started an application before and did not finish. Was something unclear? [Tell us in one line] — optional, and it will not affect your application.

Store the answer in the same table as a step 0 row with `step_name = 'feedback'` and the text in a new nullable `note` column. Keep it optional, keep it one line, and never make it a condition of continuing.

Twenty of those sentences will be worth more than a year of funnel charts.

---

## Task 4 — Show Matt the funnel

An admin screen, **both platforms**, showing for a chosen period:

```
/apply page views          560
  Step 1 reached           ???  (—%)
  Step 2 reached           ???  (—%)
  Step 3 reached           ???
  Step 4 reached           ???
  Step 5 reached           ???
  Step 6 reached           ???
  Submitted                  6  (1.1%)
```

- Page views come from the existing `page_views` table where `path = '/apply'`.
- Show the **drop between each step** as the headline number, not the absolute count. The biggest single drop is the thing to fix.
- Split by **device**. A six-step form with an ID number field behaves very differently on a phone, and most of this traffic will be phones.
- Default to the last 30 days, with a date range picker.
- Show any feedback lines from Task 3 underneath, newest first.

Put it where the applications list is, not in a separate analytics section Matt will never open.

---

## Do not

- Do not store names, emails, phone numbers, IP addresses or user agents in this table. It is anonymous funnel data and it must stay that way — POPIA applies and there is no business reason to identify these people.
- Do not change the application form's fields, order, validation or wording in this prompt. **Measure first.** Changing the form and the measurement at the same time means you learn nothing from either.
- Do not let a tracking failure surface to the applicant in any way.
- Do not add a cookie or any third-party analytics script.

---

## Report

1. `0178` in both migration folders, byte-identical. Show the diff.
2. Proof the public role can insert but cannot select — run both as `anon` and paste the results.
3. The event fires once per step: open the form, go forward to step 3, back to step 1, forward to step 4, and show the table holds exactly **4 rows**, one per step reached.
4. Screenshot of the funnel screen on both platforms.
5. Confirmation that a forced tracking failure does not block submission — break the insert deliberately and show the form still works.
6. `npx tsc --noEmit` clean in both repos.

**Do not submit a test application to production.** Everything above can be proven without completing the form; step events are written as you move through it, not at the end.
