# Cursor Prompt — Apply migrations 0173 to 0176, then deploy

## Read all of this before you touch anything

Four migrations are written and none are applied. The matching code is written and **not pushed**. Both halves have to happen, **in this order**, or the site breaks.

A full backup was taken on 10 Sep 2026 — data and all 904 storage files. There is a restore path if this goes wrong, but the point is that it should not.

**Order is not negotiable:**

1. Apply `0173` → verify
2. Apply `0174` → verify
3. Apply `0175` → verify
4. Apply `0176` → verify
5. Regenerate types, `npx tsc --noEmit` in both repos
6. Commit and push
7. Confirm the live deployment is serving the new commit
8. Run the safety checks in the last section

**If any step fails, stop there and report.** Do not carry on to the next migration. Do not push code for a migration that did not apply.

---

## Why the order matters

`0175` depends on `0173` — it inserts into the `document_categories` table that 0173 creates. It has a guard at the top that raises an exception if 0173 is missing, so it will refuse rather than half-run. Leave that guard in place.

`0176` adds `applications.submission_id`. The apply route already handles the column being absent, so that one is safe in either order — but do it last anyway and keep the sequence simple.

---

## The four migrations

| File | What it does |
|---|---|
| `0173_document_categories.sql` | Lookup table for document categories, replaces the check constraint with a foreign key |
| `0174_equipment_item_types.sql` | `equipment_types` lookup, adds `catalogue_items.equipment_type` |
| `0175_employee_documents.sql` | `employee` document type, 10 employee categories, admin-only restrictive policies |
| `0176_application_submission_id.sql` | `applications.submission_id` + partial unique index |

All four already end with `notify pgrst, 'reload schema';`. Do not remove those lines and do not add a second one.

---

## Verify after each — these are the real numbers, taken from the live database on 10 Sep

### After 0173

```sql
select count(*) from public.document_categories;                          -- expect 36
select count(*) from pg_constraint where conname='documents_category_check';  -- expect 0
select count(*) from pg_constraint where conname='documents_category_fkey';   -- expect 1
select is_active from public.document_categories where key='application_supporting';  -- expect false
```

### After 0174

```sql
select count(*) from public.equipment_types;                              -- expect 13
select count(*) from information_schema.columns
 where table_name='catalogue_items' and column_name='equipment_type';     -- expect 1
```

Then prove the foreign key bites — this **must** fail:

```sql
update public.catalogue_items set equipment_type='nonsense' where code='microchip';
```

Paste the error. If it succeeds, the foreign key is not doing its job — roll it back and stop.

### After 0175

```sql
select count(*) from public.document_categories;                          -- expect 46
select count(*) from public.document_categories
 where 'employee' = any(entity_types);                                    -- expect 12
```

Confirm `documents_entity_type_check` now includes `employee` **and still includes all twelve original values** — dog, litter, puppy, client, application, training, contract, kennel, health, show, invoice, payment. Paste the constraint definition.

### After 0176

```sql
select count(*) from information_schema.columns
 where table_name='applications' and column_name='submission_id';         -- expect 1
select count(*) from pg_indexes where indexname='applications_submission_id_key';  -- expect 1
```

---

## The part that actually needs care

`0175` adds **restrictive** row-level security policies to `public.documents` **and** to `storage.objects`. Restrictive policies are AND-ed with everything else — a mistake there does not leak data, it **locks people out**, which is just as bad and much easier to miss.

**Take these numbers before you start, and check them again after 0175. They must not move.**

Baseline as at 10 Sep 2026:

| Measure | Value |
|---|---|
| `documents` rows | **150** |
| `is_public = true` | **0** |
| `client_visible = true` | **124** |
| `entity_type = 'dog'` | **116** |
| objects in the `documents` storage bucket | **159** |

Then check it from the outside, not just with SQL:

1. **As a signed-in client** — open the portal and confirm their dog's documents still list and still open. If a document that worked this morning now 404s, `0175` is the cause. Say so immediately.
2. **Signed out** — the public dog pages must still render. They showed **0** documents before, so they should still show 0. Any change either way is wrong.
3. **As admin** — open a dog's documents and confirm they list and download.

`0175` also replaces `document_ids_visible_to`. **The only change is one added line** — `and d.entity_type is distinct from 'employee'`. Everything else is byte-identical to what is live. If your diff shows anything else changing, stop and report it; a previous change to a function used in a security policy caused a 6.7 hour outage on this project.

---

## Then the code

Types are stale — the database will have four migrations' worth of new columns and tables.

1. Regenerate the Supabase TypeScript types in **both** repos.
2. `npx tsc --noEmit` in both. Paste the real output.
3. Commit and push.
4. **Confirm the live deployment is serving your commit.** Not "the build succeeded" — check the deployed commit hash against `origin/main`. This morning production was 17 hours behind a fix that had been committed but never pushed. Report the commit hash and the deployment URL.

---

## After the deploy — prove the new features actually work

- `/admin/stock` loads and shows **12 items, all inactive**, each marked as a starter suggestion.
- Open the catalogue editor on a new item and confirm the **price field is visible without unticking anything**, and that there is an **Active** switch.
- `delivery_travel` shows **11** under "on quotes" with the do-not-delete warning.
- The app's stock screen shows the same five counters.

---

## Do not

- Do not create test employees, test applications, test catalogue items or test documents in production. If you must test end to end, use obviously disposable data, tell Matt exactly what you used, and delete it in the same session.
- Do not modify any migration file. They are reviewed. Apply them as written.
- Do not touch `documents.client_visible` or `is_public` on any existing row.
- Do not revoke EXECUTE on `is_admin`, `document_ids_visible_to`, `my_client_ids`, `dog_ids_for` or `parent_ids_for` — every one of them is used inside a security policy.
- Do not switch any catalogue item on. Matt decides what goes in the shop.

---

## Report

1. Each migration, in order, with its verification numbers next to the expected ones.
2. The foreign key rejection error from the 0174 test.
3. The five baseline numbers re-checked after 0175, side by side with the values above.
4. What you saw as client, signed out, and as admin.
5. The `document_ids_visible_to` diff — should be one line.
6. `npx tsc --noEmit` output, both repos.
7. Commit hash, and confirmation the live site is serving it.
8. The four post-deploy checks.
