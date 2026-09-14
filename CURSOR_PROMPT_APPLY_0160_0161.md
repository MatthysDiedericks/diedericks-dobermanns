# Cursor Prompt — Apply 0160 and 0161 to the live database

Matt has approved applying these. A database backup is scheduled for 10am tomorrow, **not** taken yet, so work carefully and stop at the first thing that looks wrong.

## Rules

1. **Run the migrations from the files on disk. Do not retype, reformat, or regenerate them.** They have been reviewed and corrected — a fresh generation would reintroduce two bugs that were already found and fixed.
2. **One at a time.** Apply 0160, run its checks, report. Only then 0161.
3. If any check returns a number other than the one stated, **stop and report**. Do not attempt a fix-forward.
4. Do not touch any other migration.

---

## Step 1 — Apply 0160

Run `supabase/migrations/0160_multi_dog_applications.sql` against the live database.

It runs in a single transaction, so an error rolls the whole thing back and nothing is half-applied.

### Then run these checks and paste the real numbers

```sql
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='waiting_list'
      and column_name='queue_anchor_at')                                   as queue_anchor_col,
  (select count(*) from public.waiting_list where queue_anchor_at is null) as anchors_missing,
  (select count(*) from public.waiting_list
     where application_id is not null and sibling_group_id is null)        as groups_missing,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='application_dog_requests') as requests_table,
  (select count(*) from pg_policies
    where schemaname='public' and tablename='application_dog_requests')    as requests_policies,
  (select count(*) from public.application_dog_requests)                   as seeded_requests;
```

Expected: `1, 0, 0, 1, 2, 22`

`seeded_requests` should equal the number of applications (22). Every existing application gets one request line.

### The check that matters most — queue order must not have moved

```sql
select w.enquirer_name, w.pipeline_stage,
       row_number() over (order by w.queue_anchor_at, w.request_index) as position
from public.waiting_list w
where w.status = 'active'
order by position;
```

There are 14 active waiting-list rows. Paste the full list. **Anyone who was third must still be third** — that is the entire purpose of `queue_anchor_at`. If the order looks reshuffled, say so before going any further.

### Confirm the three replaced functions still exist and are callable

```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and proname in ('process_quote_lapse_ladder','lapse_one_quote',
                  'promote_waitlist_on_payment','quote_has_paid_or_reserved_sibling')
order by proname;
```

Expected: all four rows.

**Do not call `process_quote_lapse_ladder()` to test it.** It sends real emails to real clients.

---

## Step 2 — Apply 0161, only if step 1 passed

Run `supabase/migrations/0161_equipment_shop_and_consent.sql`.

```sql
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='catalogue_items'
      and column_name='is_client_visible')                                 as shop_flag,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='equipment_enquiries')      as enquiries_table,
  (select count(*) from pg_policies
    where schemaname='public' and tablename like 'equipment_enquir%')      as enquiry_policies,
  (select count(*) from information_schema.role_table_grants
    where table_schema='public' and table_name='equipment_enquiries'
      and grantee='anon')                                                  as anon_grants,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='applications'
      and column_name='marketing_opt_in')                                  as consent_col,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='submit_equipment_enquiry')     as submit_fn;
```

Expected: `1, 1, 4, 0, 1, 1`

**`anon_grants` must be 0.** Anonymous visitors reach the enquiry tables only through `submit_equipment_enquiry`.

### Then confirm 0161 did not undo the price lock

```sql
set local role anon;
select count(microchip_number) from public.dogs;
```

This **must** fail with `permission denied for table dogs`. If it returns a number, 0161 has re-granted table-level select on `dogs` and undone migration 0159 — stop immediately and tell Matt, that is a live data exposure.

```sql
set local role anon;
select count(*) from public.dogs;
```

This **must** return `31`. The public site still needs to list dogs.

---

## Step 3 — Regenerate types

Both repos:

```powershell
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr | Set-Content -Encoding utf8 types/database.types.ts
```

**Do not use `>` redirection.** PowerShell writes UTF-16LE and produces phantom TypeScript errors — this has cost a full afternoon on this project before.

Then `npx tsc --noEmit` in both repos, commit, push, and prove it landed:

```
git rev-parse HEAD origin/main
git rev-list --left-right --count origin/main...HEAD
```

Hashes identical, count `0	0`.

---

## Step 4 — Turn the shop on

Nothing is client-visible yet, which is why the shop page reads "Nothing in the shop just yet".

Do **not** flip the flags yourself. Tell Matt which of the 7 active catalogue items exist, and that he sets `is_client_visible` and adds a photo per item from the admin catalogue screen.

---

## Report

- the numbers from every block above, as actually returned
- the full 14-row queue list
- `tsc` output for both repos
- the two hashes and ahead/behind count
- confirmation that you ran the migrations **from the files** and did not regenerate them
