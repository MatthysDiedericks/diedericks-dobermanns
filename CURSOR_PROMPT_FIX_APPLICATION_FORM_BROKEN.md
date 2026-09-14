# URGENT — The public application form is rejecting every submission

## Read this first

The live application form has been failing since **8 September 2026**. **Zero applications have been saved since then.** The last one that worked was Wanda Von Mollendorff on 7 September.

This morning at 06:31 a real person spent **eight minutes** filling in the form and lost it. We have no name and no email for them — only the failure record.

Treat this as the only job until it is fixed.

---

## The cause, already diagnosed — do not re-investigate from scratch

`src/app/api/apply/route.ts` inserts into `applications` at line 189. Three of the columns it writes **do not exist on the table**:

| Line | Column | In the database? |
|---|---|---|
| 206 | `buyer_location_type` | **missing** |
| 207 | `export_terms_acknowledged` | **missing** |
| 208 | `export_terms_acknowledged_at` | **missing** |

PostgREST rejects the whole insert with `PGRST204` (column not found in schema cache), so **every** application fails — not only international ones, because the route sends these fields on every submission regardless of buyer type.

Verified against the live database on 10 September 2026. `dogs_requested` and `marketing_opt_in` **do** exist and are fine — do not touch those.

This is the export/SADC buyer feature: the form collects it, the migration that should have added the columns was never written.

---

## Task 1 — Migration 0164, add the three columns

Check the highest number in `supabase/migrations/` first and use the next one. As at 10 Sep the last is `0163`, so this should be `0164`. Byte-identical in **both** repos.

```sql
-- 0164_application_export_buyer_fields.sql
-- The apply form has written these three fields since 8 Sep 2026 but the columns
-- were never created, so PostgREST rejected every insert with PGRST204 and no
-- application was saved for two days. Additive only.

alter table public.applications
  add column if not exists buyer_location_type          text,
  add column if not exists export_terms_acknowledged    boolean not null default false,
  add column if not exists export_terms_acknowledged_at timestamptz;

alter table public.applications
  drop constraint if exists applications_buyer_location_type_check;
alter table public.applications
  add constraint applications_buyer_location_type_check
  check (buyer_location_type is null
         or buyer_location_type in ('local','sadc','international'));
```

**Check the allowed values against the form before you commit to that constraint.** Read `src/components/forms/ApplicationForm/Step1Personal.tsx` and `schema.ts` and use exactly the values the form can produce. If they differ from `local` / `sadc` / `international`, use the form's values — a constraint that rejects a real answer would recreate the same outage in a different place.

`buyer_location_type` is deliberately nullable with no default, because every existing application predates the field.

**Do not add `extra_dog_requests` or `id_present` as columns.** They appear in the logged form body but the route does not insert them, so they are not the fault. Per-dog preferences already live in `application_dog_requests` and the route correctly writes them through `save_application_dog_requests` at line 272 — leave that alone.

---

## Task 2 — Apply it, then prove the form works

Apply `0164` to the live database.

Then **reload the PostgREST schema cache**, or the API will keep rejecting the columns even though they now exist:

```sql
notify pgrst, 'reload schema';
```

Then confirm:

```sql
select count(*) as should_be_3
from information_schema.columns
where table_schema='public' and table_name='applications'
  and column_name in ('buyer_location_type','export_terms_acknowledged','export_terms_acknowledged_at');
```

---

## Task 3 — The check that actually matters

A schema query does not prove the form works. **Submit a real application through the live website form and confirm it saves.**

Use an obviously disposable name and email so Matt can delete it, tell him exactly what you used, and delete it yourself afterwards:

```sql
select id, full_name, email, buyer_location_type, created_at
from applications order by created_at desc limit 1;
```

Then remove it. **Do not leave a test application in production** — that has happened on this project before and it ends up attached to a real contact.

Also confirm no new `APPLY_DB_ERROR` row appears:

```sql
select code, occurred_at, detail->>'sqlstate' as sqlstate
from error_events
where code = 'APPLY_DB_ERROR' and occurred_at > now() - interval '1 hour';
```

Expect zero rows.

---

## Task 4 — Why this was invisible, and the small fix for it

The form failed silently for two days because nothing watches for it. The failure was logged correctly to `error_events` as `APPLY_DB_ERROR` at severity `error` — but the daily digest at 05:00 did not put it in front of Matt in a way he acted on.

Check `error-events-alert` and `error-events-digest`: **an `APPLY_DB_ERROR` should page immediately, not wait for the morning digest.** A broken application form is lost revenue for every hour it stays broken. If those functions already support an immediate-alert severity, raise this code to it. If not, say so and leave it — do not redesign the alerting in this prompt.

---

## Do not

- Do not touch `waiting_list`, `reservations`, `dogs` or any pricing.
- Do not change `save_application_dog_requests` or `application_dog_requests`.
- Do not "helpfully" re-grant anything on `dogs` — the microchip and price locks from `0159` must stay exactly as they are.
- Do not revoke EXECUTE on any function used in a row-level security policy.

---

## Report

1. The exact allowed values you found in the form for `buyer_location_type`, and the constraint you wrote.
2. `0164` present in both migration folders and byte-identical — show the diff.
3. The column count query — expect 3.
4. Confirmation you reloaded the schema cache.
5. **The name and email of the test application you submitted, and confirmation you deleted it.**
6. Zero new `APPLY_DB_ERROR` rows.
7. `npx tsc --noEmit` clean in both repos.
