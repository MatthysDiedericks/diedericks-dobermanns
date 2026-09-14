# Cursor Prompt — Dog identifiers: owner sees their own, nobody else

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericks-dobermanns` and `diedericksdobermann-web`.
3. **Two migrations, 0162 and 0163, applied at different times.** 0162 is additive and safe. 0163 is the lock and must not be applied until the code from Task 2 is deployed. Getting this order wrong takes the public site down and breaks the contract PDFs.
4. Byte-identical files in both `supabase/migrations/` folders.
5. Do not apply anything. Matt applies, in the order stated.

---

## The problem, measured on the live database today

Tested as Leo Middelberg, a real client who owns **one** dog:

| Identifier | Leo can read | Anonymous visitor can read |
|---|---|---|
| microchip_number | **19** | 0 (locked by 0159) |
| registration_number | **9** | **9** |
| dna_number | **1** | **1** |
| tattoo_number | **1** | **1** |
| passport_number | 0 | 0 |
| insurance_number | 0 | 0 |

Leo owns one dog and can read nineteen microchip numbers. Worse, three identifier columns are readable by **anyone on the internet with no login at all**.

Migration 0159 locked `microchip_number` and `price` from anonymous users. It was too narrow — it fixed the two columns that had been named and left four siblings of the same kind wide open.

**Why a column-by-column patch will not work this time.** Admins are `authenticated` users, exactly like clients. A column grant cannot say "admins yes, clients no". Row-level security *can* — but only per row, and the identifiers live on rows that clients are legitimately allowed to see (the 31 public dogs).

So the identifiers have to move to their own table, where row-level security can protect them properly.

---

## Task 1 — Migration 0162: the protected table (safe, additive)

```sql
create table if not exists public.dog_identifiers (
  dog_id              uuid primary key references public.dogs(id) on delete cascade,
  microchip_number    text,
  tattoo_number       text,
  passport_number     text,
  dna_number          text,
  insurance_number    text,
  registration_number text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists dog_identifiers_microchip_key
  on public.dog_identifiers (microchip_number)
  where microchip_number is not null;

insert into public.dog_identifiers
  (dog_id, microchip_number, tattoo_number, passport_number,
   dna_number, insurance_number, registration_number)
select id, microchip_number, tattoo_number, passport_number,
       dna_number, insurance_number, registration_number
from public.dogs
on conflict (dog_id) do nothing;

alter table public.dog_identifiers enable row level security;
```

The partial unique index preserves the existing `microchip_number unique` constraint while allowing many nulls.

### Policies — a new table with RLS on and no policy denies everyone

```sql
create policy "Admins manage dog identifiers"
on public.dog_identifiers for all
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Trainers read dog identifiers"
on public.dog_identifiers for select
using ((select public.is_trainer_or_above()));

create policy "Owners read their own dog identifiers"
on public.dog_identifiers for select
using (dog_id in (select public.dog_ids_for(auth.uid())));

grant select on public.dog_identifiers to authenticated;
grant select, insert, update, delete on public.dog_identifiers to service_role;
```

**No grant to `anon`.** Identifiers are never public.

`dog_ids_for()` already covers owned dogs, confirmed reservations and active waiting-list allocations — reuse it, do not write a new ownership rule.

**TRAP:** do not `revoke execute` on `dog_ids_for`, `is_admin` or `is_trainer_or_above`. They are called inside RLS policies; revoking EXECUTE makes the policy error and the table returns nothing. That caused a 6.7 hour outage on this project.

### Keep the two copies in step until 0163

While both the old columns and the new table exist, a write to one must reach the other:

```sql
create or replace function public.trg_sync_dog_identifiers()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  insert into public.dog_identifiers as di
    (dog_id, microchip_number, tattoo_number, passport_number,
     dna_number, insurance_number, registration_number)
  values
    (new.id, new.microchip_number, new.tattoo_number, new.passport_number,
     new.dna_number, new.insurance_number, new.registration_number)
  on conflict (dog_id) do update set
    microchip_number    = excluded.microchip_number,
    tattoo_number       = excluded.tattoo_number,
    passport_number     = excluded.passport_number,
    dna_number          = excluded.dna_number,
    insurance_number    = excluded.insurance_number,
    registration_number = excluded.registration_number,
    updated_at          = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_dog_identifiers on public.dogs;
create trigger trg_sync_dog_identifiers
  after insert or update of microchip_number, tattoo_number, passport_number,
                            dna_number, insurance_number, registration_number
  on public.dogs
  for each row execute function public.trg_sync_dog_identifiers();
```

---

## Task 2 — Repoint every read (code only, no migration)

Find every read of these six fields and change it to come from `dog_identifiers`. Known call sites, from a grep of the app repo — **verify this list yourself, do not trust it**:

- `hooks/useDogs.ts` — `DOG_STAFF_DETAIL_SELECT`
- `hooks/useKennelDogs.ts`, `hooks/useAdmin.ts`
- `hooks/usePortal.ts` — `PORTAL_DOG_SELECT` and `RESERVATION_SELECT`
- `lib/contracts/renderSaleContract.ts`, `lib/contracts/tokens.ts`
- `lib/reports/litterReportPdf.ts`, `hooks/useLitterReports.ts`
- `hooks/useLitterPuppySearch.ts` — searches with `ilike` on `microchip_number`
- `lib/dogs/search.ts`
- `components/dogs/detail/DogOverviewTab.tsx`, `components/dogs/profile/AdminWorkStrip.tsx`, `components/portal/DogInfoTab.tsx`, `components/dogs/KennelDogCard.tsx`, `app/(admin)/dogs/[id].tsx`

Use the PostgREST embed rather than a second round trip:

```
dog_identifiers!dog_identifiers_dog_id_fkey(microchip_number, registration_number)
```

Because RLS now governs the embed, a client asking for another dog's identifiers gets `null` — the page renders, the number is simply absent. Make sure each component handles a null identifier row without crashing.

**`DOG_LIST_SELECT` and `DOG_DETAIL_SELECT` must not embed identifiers at all.** Those are the anonymous public payloads.

**Do not remove any field from the contract or report paths.** A sale contract must still print the microchip — an admin generating it passes the admin policy and gets the real value.

---

## Task 3 — Migration 0163: the lock. Only after Task 2 is deployed and verified.

```sql
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'dogs'
    and column_name not in ('microchip_number','price','tattoo_number',
                            'passport_number','dna_number','insurance_number',
                            'registration_number');

  revoke select on public.dogs from anon;
  revoke select on public.dogs from authenticated;
  execute format('grant select (%s) on public.dogs to anon', cols);
  execute format('grant select (%s) on public.dogs to authenticated', cols);
end $$;
```

Built as "every column except", so no screen breaks on a column nobody anticipated. **Re-run this block after any future migration that adds a column to `dogs`**, or the new column will be unreadable.

Note this also revokes from `authenticated` — that is the point. Admins read identifiers through `dog_identifiers`, where their policy grants everything.

**Do not drop the columns from `dogs` yet.** Leave them and the sync trigger in place for one month as a fallback. Dropping them is a later, separate migration.

---

## What NOT to change

- Do not touch `registered_name`. That is the pedigree display name, it is public, and it is a different column from `registration_number`.
- Do not weaken the 0159 lock on `price`; the column list above keeps it excluded.
- Do not add `anon` to anything.
- Do not revoke EXECUTE on any function named in an RLS policy.

---

## A decision for Matt, ask before assuming

`registration_number` (the KUSA number) is currently readable by anonymous visitors on 9 dogs. It appears on pedigree certificates, so it may be intended to be public. This prompt **protects** it. If Matt wants it public, it is one line — remove it from the exclusion list in 0163 and add it back to the public selects. **Ask him.**

---

## Acceptance checks — report the real number for each

After 0162:

```sql
select (select count(*) from public.dog_identifiers) as rows,          -- expect 173
       (select count(*) from pg_policies
         where schemaname='public' and tablename='dog_identifiers') as policies, -- expect 3
       (select count(*) from information_schema.role_table_grants
         where table_schema='public' and table_name='dog_identifiers'
           and grantee='anon') as anon_grants;                          -- expect 0
```

After Task 2 deploys, grep both repos: zero reads of `dogs.microchip_number` (or the other five) outside `dog_identifiers` queries and the migration files. List what you searched.

After 0163, as the `anon` role — every one of these must return **permission denied**:

```sql
set local role anon;
select count(microchip_number)    from public.dogs;
select count(registration_number) from public.dogs;
select count(dna_number)          from public.dogs;
select count(tattoo_number)       from public.dogs;
select count(price)               from public.dogs;
```

And these must still work:

```sql
set local role anon;
select count(*) from public.dogs;   -- expect 31, the public site still lists dogs
```

**The close-out is rendered, not SQL.** Sign in as a real client with one dog and confirm on the page: their own dog's microchip is visible, and opening any kennel dog shows no microchip. Then sign in as admin and confirm a sale contract PDF still prints the microchip. A query run as an admin cannot detect a page that renders as an admin.
