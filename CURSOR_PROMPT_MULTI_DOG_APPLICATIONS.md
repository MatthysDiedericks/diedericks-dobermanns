# Cursor Prompt — One application, more than one dog

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericks-dobermanns` (app) and `diedericksdobermann-web` (website).
3. Migration goes in **both** `supabase/migrations/` folders, byte-identical. Next number is **0160**.
4. Do **not** apply anything to the live database. Matt applies it.
5. No test rows in production.
6. Finish with `npx tsc --noEmit` in both repos and paste the real output.

---

## The problem, precisely

A client wants two puppies. They may come from **different litters, five or six months apart**.

Today one `waiting_list` row does three separate jobs:

| Job | Columns |
|---|---|
| Standing in the queue | `position`, `priority`, `date_added` |
| What they want | `preferred_sex`, `preferred_colour`, `ear_preference`, `tail_preference`, `preferred_category` |
| What they've been given | `assigned_dog_id`, `assigned_litter_id`, `quote_id`, `deposit_invoice_id`, `pipeline_stage` |

When dog one is allocated, that row moves to `reserved` and leaves the queue — **and the client's position goes with it**, because position lives on the same row. There is nowhere for "still waiting for dog two" to live.

Two things already work in our favour: there is **no unique constraint** on `waiting_list.application_id`, so multiple lines per application are already legal, and `reservations` is already one row per dog.

**A second dog must never become a second application.** That would re-vet the client, duplicate their contact, and reset their date. It is a new request line on the existing approved application.

---

## Task 1 — Schema (migration 0160)

### 1a. `applications`

```sql
alter table public.applications
  add column if not exists dogs_requested smallint not null default 1;

alter table public.applications
  add constraint applications_dogs_requested_range
  check (dogs_requested between 1 and 4);
```

### 1b. New child table — what they asked for, per dog

The applicant fills this in before approval, so it cannot live on `waiting_list` yet.

```sql
create table if not exists public.application_dog_requests (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references public.applications(id) on delete cascade,
  request_index      smallint not null,
  preferred_sex      text,
  preferred_colour   text,
  ear_preference     text,
  tail_preference    text,
  preferred_category text,
  preferred_timeline text,
  budget_range       text,
  notes              text,
  created_at         timestamptz not null default now(),
  unique (application_id, request_index)
);

alter table public.application_dog_requests enable row level security;
```

RLS — mirror the existing `applications` policies exactly:

```sql
create policy "Applicants read own dog requests"
on public.application_dog_requests for select
using (exists (select 1 from public.applications a
               where a.id = application_dog_requests.application_id
                 and a.user_id = auth.uid()));

create policy "Admins manage dog requests"
on public.application_dog_requests for all
using ((select public.is_admin())) with check ((select public.is_admin()));
```

Request 1 is backfilled from the existing singular columns on `applications` so nothing is lost:

```sql
insert into public.application_dog_requests
  (application_id, request_index, preferred_sex, preferred_colour, tail_preference,
   preferred_timeline, budget_range)
select id, 1, preferred_sex, preferred_colour, tail_preference,
       preferred_timeline, budget_range
from public.applications
on conflict (application_id, request_index) do nothing;
```

### 1c. `waiting_list` — separate standing from allocation

```sql
alter table public.waiting_list
  add column if not exists request_index    smallint     not null default 1,
  add column if not exists sibling_group_id uuid,
  add column if not exists queue_anchor_at  timestamptz;
```

**`queue_anchor_at` is the whole fix.** Position is ordered on it, and it is set from the
**application's** `created_at` — never from the row's `date_added`. Allocating dog one
therefore cannot move dog two backwards.

Backfill:

```sql
update public.waiting_list w
   set queue_anchor_at = coalesce(
         (select a.created_at from public.applications a where a.id = w.application_id),
         w.date_added,
         w.created_at)
 where w.queue_anchor_at is null;

alter table public.waiting_list alter column queue_anchor_at set not null;

create index if not exists waiting_list_queue_anchor_idx
  on public.waiting_list (queue_anchor_at, request_index);
```

**Every query that orders the queue must order by `queue_anchor_at, request_index`.**
Grep both repos for `date_added` and `position` in ordering clauses and change them. List every file you changed.

---

## Task 2 — Rules that must hold

1. **Allocating or taking payment on line 1 must not touch line 2.** Separate rows, separate `pipeline_stage`. Never cascade a stage change across sibling lines.
2. **A paid or reserved line stays visible on the waiting list.** Matt's words: *"they need to stay on the waiting list when paid."* Today `status='reserved'` filters a client out of the waiting-list view. Change the view so sibling lines are shown grouped under the client with their individual stages, not dropped.
3. **Withdrawal is per line.** Dropping dog two leaves dog one's position, deposit and contract untouched.
4. **Never create a second application** for a second dog. The admin action is "Add another dog to this application", which inserts an `application_dog_requests` row and, once approved, a second `waiting_list` line sharing `sibling_group_id` and `queue_anchor_at`.

---

## Task 3 — Money, and the conflict you must resolve

Matt asked for **one quote covering both dogs**, with **deposit rules per dog**, and the dogs may arrive **five or six months apart**. Those pull against each other, because unpaid quotes lapse on the printed validity date and the second puppy does not exist yet.

Build it this way:

- **One quote**, one line per dog. Dog two's line reads as a future placement (litter TBC) with its own deposit amount. This is the commercial agreement the client signs up to.
- **A deposit invoice per dog**, not one combined. Each `waiting_list` line points at its own `deposit_invoice_id`.
- **A balance invoice per dog**, raised when that specific dog is allocated.
- **Two contracts** — a sale contract is per dog (microchip, pedigree, health terms). `contracts.dog_id` is already singular, so this needs no schema change.

**Critical:** the quote-lapse job must not lapse a multi-dog quote while any sibling line is still awaiting allocation, and lapsing must never cascade into a paid sibling. Find the lapse logic (search `lapse` and `quote_expires_date`) and exclude quotes whose `sibling_group_id` has a line in `deposit_paid` or `reserved`. Say in your summary exactly which file and function you changed.

---

## Task 4 — Screens

**Application form (both repos).** After the dog-preference step, ask "How many dogs are you applying for?" (1–4, default 1). For each, capture the per-dog preference set and write one `application_dog_requests` row. Do not duplicate the whole questionnaire — vetting is per household, preferences are per dog.

**Admin — waiting list.** Group sibling lines under one client with a "Dog 1 of 2" badge, each showing its own stage, allocated dog and deposit status. A reserved line stays on screen.

**Admin — allocation.** When allocating, show which request line is being filled and that the client has another outstanding. Never silently fill both.

**Portal — client profile.** Matt: *"their profile needs to be able to deal with more than one dog."* The portal must render a list, not a single record: each dog they own or await, each deposit paid, each contract, each invoice. Check `usePortalDogs` and the portal dogs/invoices pages for anywhere a single record is assumed — `.maybeSingle()`, `[0]`, a lone `dog` variable — and list every one you found.

---

## What NOT to change

- Do not add a unique constraint on `waiting_list.application_id`. Multiple lines per application is the point.
- Do not touch `my_client_ids()` or `my_financial_client_ids()`. `waiting_list` and `reservations` were deliberately moved to the financial gate on 6 Sep 2026 (migration 0158) because they carry `quoted_price` and `total_price`.
- Do not revoke EXECUTE on any function used in an RLS policy. That caused a 6.7 hour outage on this project.
- New tables need RLS enabled **and** a policy. RLS on with no policy denies everyone.

---

## Acceptance checks — report the real number for each

1. `npx tsc --noEmit` clean in both repos. Paste the output.
2. Migration `0160` exists in both folders and the two copies are byte-identical. Show the diff.
3. `application_dog_requests` has RLS enabled and exactly 2 policies.
4. Every ordering by `date_added` or `position` in queue queries now uses `queue_anchor_at`. List the files.
5. List every single-record assumption you found in the portal and how you fixed it.
6. Name the file and function where you changed the quote-lapse rule.
7. Confirm in writing you did not run anything against the live database.

**Then the test that actually matters.** After Matt applies 0160, sign in as a real client with two request lines and confirm on the rendered page — not in SQL — that: dog one shows as allocated, dog two still shows a queue position, that position is unchanged from before dog one was allocated, and both deposits appear separately. A SQL check cannot prove this; a query run as an admin cannot detect a page that renders as an admin.
