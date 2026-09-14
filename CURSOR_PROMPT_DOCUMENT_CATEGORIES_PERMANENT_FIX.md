# Cursor Prompt — Document categories: make the mismatch impossible, permanently

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericks-dobermanns` and `diedericksdobermann-web`.
3. Migration number: check `supabase/migrations/` and use the next free one. **0165 is already taken** (`0165_delivery_confirmed_by_client_alert.sql`) and the highest on disk is `0169`, so use **0171** — `0170` is reserved by `CURSOR_PROMPT_SHOP_PRICING_AND_ITEM_TYPES.md`. Byte-identical in both folders.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What went wrong, and why a patch is not enough

On 10 Sep 2026 a real applicant uploaded her ID and the file was rejected with:

```
new row for relation "documents" violates check constraint "documents_category_check"
```

The website was writing `category: "Application Supporting Doc"`. The database only accepts `application_supporting_doc`. That one line is already fixed.

**The fix is not the point. The point is that nothing prevented it.** The allowed values live in three places that can drift apart with nobody noticing:

| Where | Form | Example |
|---|---|---|
| Database check constraint | snake_case keys | `application_supporting_doc` |
| Website | hard-coded string literals | `"Application Supporting Doc"` |
| App — `lib/documents/constants.ts` | display labels | `'Application Supporting Doc'` |

Nothing joins them. TypeScript cannot help, because a check constraint is a runtime rule and the generated type for `category` is simply `string`. So any of the three can change and the other two silently disagree until a customer hits it.

**Two more faults this exposes, both currently live:**

- The app's `DOG_CATEGORIES` and `CLIENT_CATEGORIES` contain **`'Parent Health Records'`, which has no key in the constraint at all.** Choosing it can never save.
- Even `'Other'` fails — the constraint wants lowercase `other`.
- The constraint has both `application_supporting` **and** `application_supporting_doc`, two keys for one idea.

Every category currently stored is a valid lowercase key, which tells you the app's document picker has never successfully written a category. It has been broken since it was written.

---

## The permanent fix: one source of truth, enforced by the database

Replace the check constraint with a **lookup table**, and point a foreign key at it.

That is what makes it permanent:

- A wrong value becomes **impossible** — the database refuses it, in every app, forever.
- The **label lives next to the key**, so display text and stored value cannot diverge.
- Both platforms **read the list from the database**, so there is no hard-coded list left to go stale.
- Adding a category becomes **one insert**, and it appears in the app and the website at once with no deploy.

---

## Task 1 — Migration 0165

### 1a. The lookup table

```sql
create table if not exists public.document_categories (
  key          text primary key,
  label        text not null,
  entity_types text[] not null default '{}',
  sort_order   integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.document_categories enable row level security;

create policy "Anyone signed in can read document categories"
on public.document_categories for select
using (true);

create policy "Admins manage document categories"
on public.document_categories for all
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.document_categories to anon, authenticated;
```

Read is deliberately open — these are labels like "Pedigree", not client data. Public dog pages already show document categories, so `anon` needs read.

### 1b. Seed it from what is actually in use

Seed every key currently in `documents_category_check`, with the label the app already shows and the entity types it belongs to. Derive the mapping from `diedericks-dobermanns/lib/documents/constants.ts` — `DOG_CATEGORIES`, `LITTER_CATEGORIES`, `CLIENT_CATEGORIES`, `APPLICATION_CATEGORIES`, `TRAINING_CATEGORIES`, `KENNEL_CATEGORIES`.

Two you must handle explicitly:

- **`parent_health_records`** — add it. The app offers "Parent Health Records" today and it has no key, so it can never save. Entity types: `dog`, `client`.
- **`application_supporting`** — seed it with `is_active = false` and label "Application Supporting Doc (legacy)". Keep the row so any existing data stays valid, but hide it from pickers. `application_supporting_doc` is the live one.

`other` belongs to every entity type.

### 1c. Swap the constraint for a foreign key

**Order matters. Verify before you enforce.**

```sql
-- Nothing may be left behind. Expect zero rows.
select distinct d.category
from public.documents d
left join public.document_categories c on c.key = d.category
where d.category is not null and c.key is null;
```

If that returns anything, **stop and report it** — do not invent keys to make it pass.

Then:

```sql
alter table public.documents drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_fkey
  foreign key (category) references public.document_categories(key);
```

There are 150 document rows and all use valid keys, so this should apply cleanly.

---

## Task 2 — Delete the hard-coded lists

**App:** `lib/documents/constants.ts` — remove `DOG_CATEGORIES`, `LITTER_CATEGORIES`, `CLIENT_CATEGORIES`, `APPLICATION_CATEGORIES`, `TRAINING_CATEGORIES`, `KENNEL_CATEGORIES` and rewrite `categoriesForEntity()` to read `document_categories` filtered on `entity_types` and `is_active`, ordered by `sort_order`. Cache it for the session — the list changes rarely.

**Website:** find every hard-coded category string and replace it the same way. `src/lib/applications/storeFiles.ts` already uses the correct key; leave that value alone but source it from the shared helper.

**Every picker shows `label`. Every write stores `key`.** They must never be the same variable.

---

## Task 3 — Stop the class of bug, not just this instance

**Remove the `as never` casts on document writes.** `storeFiles.ts` line 117 and the equivalents in the app. Those casts are why TypeScript stayed silent. If a cast is genuinely needed because the generated types are stale, regenerate the types instead — do not silence the compiler.

**Add a guard so this cannot come back.** A small check in `scripts/` that fails if a Title Case category literal appears in a `.from("documents")` write — the shape of `category: "Some Label"`. Wire it into the same place `check-parity.mjs` runs. One test that fails loudly beats a convention nobody remembers.

---

## What NOT to change

- Do not delete any existing document row or change any stored `category` value.
- Do not touch storage buckets or their policies.
- Do not revoke EXECUTE on `is_admin` or any function used in a row-level security policy.
- Do not alter `documents.client_visible` or `is_public` — the health-certificate visibility we set on 8 Sep must stay as it is.

---

## Acceptance checks — report the real number for each

1. Orphan check returns **zero** rows, run **before** the foreign key is added. Paste it.
2. `document_categories` seeded — expect **36** rows (35 existing keys plus `parent_health_records`). Confirm `application_supporting` is `is_active = false`.
3. `documents_category_check` is gone and `documents_category_fkey` exists.
4. Grep both repos for Title Case category literals — expect **zero** outside the migration.
5. Grep both repos for `as never` on a `documents` write — expect **zero**.
6. `npx tsc --noEmit` clean in both repos.
7. Migration present in both folders, byte-identical. Show the diff.

**Then prove it with the real thing, not SQL.** Submit an application on the live website with a PDF attached and confirm the file row is created with `category = 'application_supporting_doc'`. Then upload a document from the app against a dog and confirm it saves. Use disposable data, tell Matt exactly what you used, and delete it afterwards.

**Last:** try to insert a document with `category = 'Nonsense Label'` and confirm the database refuses it. That refusal is the whole point of the exercise — if it succeeds, the fix is not in place.
