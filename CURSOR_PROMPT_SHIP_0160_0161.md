# Ship 0158–0161 — commit, push, then apply in order

Two parts. **Part A is for Cursor. Part B is Matt at the keyboard.** Do not let Cursor do Part B.

Current state, verified 6 Sep 2026:

| Migration | File in both repos | Committed | Applied live |
|---|---|---|---|
| 0158 financial gate | yes | **no** | **yes** |
| 0159 dog price/microchip lock | yes | **no** | **yes** |
| 0160 multi-dog | yes | **no** | no |
| 0161 equipment shop | yes | **no** | no |

0158 and 0159 were applied live during a security fix and their files were written afterwards, so the database is ahead of the repos. 0160 and 0161 are the reverse. Committing first puts everything in one known state.

---

# PART A — paste into Cursor

## Rules

1. Both repos: `diedericks-dobermanns` and `diedericksdobermann-web`.
2. **Do not apply any migration to the live database.** Do not run `supabase db push`, `supabase migration up`, or any SQL against production. Part B is a human step.
3. Do not edit the four migration files. They are final.
4. Do not use `>` redirection in PowerShell — it writes UTF-16LE and silently corrupts generated files. Use `| Set-Content -Encoding utf8`.

## A1. Show what is uncommitted, before touching anything

In each repo, list the changed and untracked files with a count. Paste the real output for both repos. Do not stage anything yet.

## A2. Stage the four migrations explicitly

```
supabase/migrations/0158_financial_gate_views_and_price_tables.sql
supabase/migrations/0159_lock_dog_microchip_and_price_from_anon.sql
supabase/migrations/0160_multi_dog_applications.sql
supabase/migrations/0161_equipment_shop_and_consent.sql
```

**Paths with `[brackets]` silently fail to stage in PowerShell.** These four have none, but the feature code in A3 includes Next.js dynamic routes that do. For any such path use `git add -- ':(literal)<path>'` and pass `-LiteralPath` to PowerShell cmdlets.

**After staging, assert the count.** `git diff --cached --name-only | Measure-Object -Line` must report exactly 4 at this step. If it reports fewer, a path failed to stage — stop and say which.

## A3. Stage the feature code for 0160 and 0161

Everything you wrote for the multi-dog and equipment-shop prompts: screens, hooks, queries, types, admin UI. **Do not** stage unrelated modified files — there are many in the working tree from earlier sessions. If you are unsure whether a file belongs, list it and ask rather than sweeping it in.

Print the full staged file list per repo before committing.

## A4. Type check before committing

`npx tsc --noEmit` in both repos. Paste the real output. **If it fails, stop.** Do not commit a broken tree.

## A5. Commit and push

One commit per repo. Message:

```
Record the live security migrations and add multi-dog applications and the equipment shop.

0158 and 0159 are already applied on the database; committing them so the
repos match. 0160 and 0161 are not applied yet — Matt applies them.
```

Then push, and **prove it landed**:

```
git rev-parse HEAD origin/main
git rev-list --left-right --count origin/main...HEAD
```

Both hashes must be identical and the count must be `0	0`. Committing without pushing has cost this project a full morning before — paste the actual output, do not assert it.

## A6. Report

- staged file count per repo
- `tsc` output
- the two hashes and the ahead/behind count per repo
- confirmation in writing that you ran **nothing** against the live database

---

# PART B — Matt, one migration at a time

Do not run both together. If something fails you want to know which one.

## B1. Back up first

Supabase dashboard → Database → Backups → take a manual backup. Note the timestamp.

## B2. Apply 0160, then check it

Run `0160_multi_dog_applications.sql`. Then run this and compare every number:

```sql
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='waiting_list'
      and column_name='queue_anchor_at')                                as queue_anchor_col,      -- expect 1
  (select count(*) from public.waiting_list where queue_anchor_at is null) as anchors_missing,     -- expect 0
  (select count(*) from public.waiting_list where sibling_group_id is null
     and application_id is not null)                                     as groups_missing,        -- expect 0
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='application_dog_requests') as requests_table,      -- expect 1
  (select count(*) from pg_policies
    where schemaname='public' and tablename='application_dog_requests')  as requests_policies,     -- expect 2
  (select count(*) from public.application_dog_requests)                 as seeded_requests;       -- expect 22
```

`seeded_requests` should equal your application count (22 today) — one request line per existing application, backfilled.

**The check that matters most.** Queue order must not have changed for anyone:

```sql
select w.id, w.enquirer_name, w.pipeline_stage,
       row_number() over (order by w.queue_anchor_at, w.request_index) as new_position
from public.waiting_list w
where w.status = 'active'
order by new_position;
```

Compare against who was where before. A client who was third must still be third.

**If anything is wrong:** the migration runs in one transaction and rolls back on error. If it applied but the numbers are wrong, restore the backup from B1 rather than patching forward.

## B3. Apply 0161, then check it

Run `0161_equipment_shop_and_consent.sql`. Then:

```sql
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='catalogue_items'
      and column_name='is_client_visible')                              as shop_flag,            -- expect 1
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='equipment_enquiries')   as enquiries_table,      -- expect 1
  (select count(*) from pg_policies
    where schemaname='public' and tablename like 'equipment_enquir%')   as enquiry_policies,     -- expect 4
  (select count(*) from information_schema.role_table_grants
    where table_schema='public' and table_name='equipment_enquiries'
      and grantee='anon')                                               as ANON_GRANTS_MUST_BE_0, -- expect 0
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='applications'
      and column_name='marketing_opt_in')                               as app_consent_col;      -- expect 1
```

`ANON_GRANTS_MUST_BE_0` is the one to watch. Anonymous users must reach the enquiry tables only through `submit_equipment_enquiry`.

Then confirm the shop is readable signed-out and the dog price lock still holds:

```sql
set local role anon;
select count(*) from public.catalogue_items;   -- expect 7 (active + client visible once you flag them)
select count(microchip_number) from public.dogs; -- expect: permission denied
```

That second line **must** error. If it returns a number, 0161 has re-granted table-level select on dogs and undone 0159.

## B4. Regenerate types, then commit those

```
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/database.types.ts
```

In PowerShell that `>` writes UTF-16LE and produces phantom TypeScript errors. Use:

```powershell
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr | Set-Content -Encoding utf8 types/database.types.ts
```

Do this in both repos, run `npx tsc --noEmit`, commit and push.

## B5. The tests that SQL cannot do

These are the close-outs. A query run as an admin cannot detect a page that renders as an admin.

**Multi-dog:** open a client with two request lines. Dog one shows allocated, dog two still shows a queue position, that position is unchanged, both deposits appear separately.

**Equipment:** open the shop **signed out** — items and prices visible. Submit an enquiry with a brand-new email, confirm exactly **one** new contact. Submit again with the **same** email, confirm **no** second contact. Then signed in as a client, confirm the form prefills and still creates no duplicate.

**Rate limit:** submit eleven enquiries in an hour from one browser. The eleventh must be refused with the "too many attempts" message, and no eleventh contact row created.
