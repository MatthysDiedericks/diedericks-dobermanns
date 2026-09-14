# Cursor Prompt — Equipment shop: price field, reactivate switch, delivery note, item types

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` (the shop lives here) and `diedericks-dobermanns` (app — see Task 6).
3. Migration number: highest on disk is `0169`, so this is **0170**. Byte-identical in both `supabase/migrations` folders.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What is wrong, verified against the live database on 10 Sep 2026

Matt loaded his first equipment item and it never appeared in the shop. He also could not find anywhere to type a price. Both are real faults in the code, not user error.

### Fault 1 — the price box is hidden by default

`CatalogueItemEditor.tsx` line 148 only renders the price input when `price_varies` is **false**:

```tsx
{!draft.price_varies ? ( <input ... Default price (ZAR) /> ) : null}
```

`blankCatalogueDraft()` line 44 sets `price_varies: true`. So **every new item opens with the price box hidden.** There is no way to discover it except by unticking a box labelled "Price varies", which does not read like "show me the price field".

### Fault 2 — there is no way to switch an item back on

The shop query requires **both** flags:

```ts
.eq("is_active", true)
.eq("is_client_visible", true)
```

`CatalogueDraft` carries `is_active`, and `payloadFromDraft()` sends it — but **the editor renders no control for it.** There is a "Deactivate" button in the list and no "Reactivate". So once an item is inactive it is inactive forever from the UI, and editing it silently writes `is_active: false` straight back.

All **12** rows in `catalogue_items` are currently `is_active = false`. That is why the shop reads "Nothing in the shop just yet" no matter what Matt ticks. This is the whole reason his item did not pull through.

For the same reason every row also has `default_price = null` and `price_varies = true` — Fault 1 meant the price field was never on screen.

### Fault 3 — no delivery wording

Nothing on the shop says delivery is extra. Matt quotes delivery separately, so a bare price reads as a landed price.

### Fault 4 — no product type

`CATALOGUE_CATEGORIES` are business categories (`dog`, `logistics`, `export`, `health`, `training`, `accessory`, `other`). Every physical product lands in `accessory`, so the shop cannot group or filter by what the thing actually is. Matt wants collar / harness / leash / crate as a real list.

---

## Task 1 — Show the price field, always

In `CatalogueItemEditor.tsx`:

- **Always render the price input.** Delete the `{!draft.price_varies ? ... : null}` wrapper.
- **Invert and rename the checkbox** to `Price on request (do not show a price in the shop)`, bound to `price_varies`. Same stored field, honest label.
- When `price_varies` is ticked, leave the price input on screen but `disabled`, with placeholder `Quoted on enquiry`. The admin can see the control exists and see why it is greyed.
- Put the price input **before** the checkbox in the DOM. It is the thing people are looking for.

Do **not** change `validatePrice()` in `actions.ts` or the `catalogue_price_consistent` constraint. Ticking "price on request" must still null the price, exactly as it does now.

## Task 2 — Add the Active switch and a Reactivate button

In `CatalogueItemEditor.tsx`, next to "Show in shop", add:

```tsx
<label className="flex items-center gap-2 text-sm text-muted">
  <input
    type="checkbox"
    checked={draft.is_active}
    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
  />
  Active
</label>
```

In `CatalogueSettingsClient.tsx`, where the list renders `{it.is_active ? <Deactivate/> : null}`, add the `else` branch — a **Reactivate** button calling a new `reactivateCatalogueItem(id)` server action in `actions.ts`, mirroring `deactivateCatalogueItem` with `is_active: true`. Revalidate the same three paths.

### And make the reason visible

The current status text is a grey run-on line. Replace the `· shop` / `· internal` / `· inactive` fragments with **badges**, and when an item is not going to appear in the shop, say exactly why:

- `is_active === false` → red badge **"Inactive — not in shop"**
- `is_active && !is_client_visible` → grey badge **"Internal only — not in shop"**
- `is_active && is_client_visible && !image_path` → amber badge **"In shop — no photo"**
- `is_active && is_client_visible && image_path` → green badge **"Live in shop"**

That badge is what stops this costing an hour again.

## Task 3 — Delivery cost excluded

Add to `src/lib/equipment/display.ts`:

```ts
/** Shown wherever a shop price appears. Delivery is quoted separately. */
export const DELIVERY_EXCLUDED_NOTE = "Delivery cost excluded";
```

Render it in `ShopClient.tsx`:

- Under the price on **every** product card, small and muted.
- Once in the enquiry form, above the submit button: `Prices exclude delivery. We confirm the delivery cost on your quote.`

Only render the per-card line when a price is actually shown — an item on "Price on request" already says nothing about price, so the note would be noise.

Do not hard-code the string in the components. One constant, imported.

## Task 4 — Equipment item types

### 4a. Migration 0170

Follow the lookup-table pattern, not a check constraint — a hard-coded list is what caused the document-category outage on 10 Sep.

```sql
-- 0170_equipment_item_types.sql
-- The shop had no product type: every physical item was category 'accessory'.
-- Lookup table + FK so a wrong value is impossible and the list can grow
-- without a deploy.

create table if not exists public.equipment_types (
  key        text primary key,
  label      text not null,
  sort_order integer not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.equipment_types enable row level security;

create policy "Anyone can read equipment types"
on public.equipment_types for select using (true);

create policy "Admins manage equipment types"
on public.equipment_types for all
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.equipment_types to anon, authenticated;

insert into public.equipment_types (key, label, sort_order) values
  ('collar',        'Collar',              10),
  ('harness',       'Harness',             20),
  ('leash',         'Leash / lead',        30),
  ('long_line',     'Long line',           40),
  ('crate',         'Crate',               50),
  ('muzzle',        'Muzzle',              60),
  ('bite_equipment','Bite equipment',      70),
  ('training_aid',  'Training aid',        80),
  ('bedding',       'Bedding',             90),
  ('bowls_feeding', 'Bowls & feeding',    100),
  ('grooming',      'Grooming',           110),
  ('apparel',       'Apparel',            120),
  ('other',         'Other',              900)
on conflict (key) do nothing;

alter table public.catalogue_items
  add column if not exists equipment_type text;

alter table public.catalogue_items
  drop constraint if exists catalogue_items_equipment_type_fkey;
alter table public.catalogue_items
  add constraint catalogue_items_equipment_type_fkey
  foreign key (equipment_type) references public.equipment_types(key);

notify pgrst, 'reload schema';
```

Nullable on purpose — services (board & train, export permit, freight) are not equipment and must not be forced into a product type.

### 4b. Wire it up

- **Editor:** an "Item type (shop)" dropdown reading `equipment_types` where `is_active`, ordered by `sort_order`, with a blank `— not an equipment item —` option. Read the list from the database, not a hard-coded array.
- **Shop:** group or filter the cards by `equipment_type`, using `label`. Items with a null type go in a final "Other" group. If there is only one group, render no filter bar.
- **Types:** add `equipment_type: string | null` to `CatalogueItem` in `lib/finance/catalogue.ts`, to `CatalogueDraft`, to `CatalogueWriteInput`, and to the `SELECT` in `catalogueQueries.ts`. Write it in both `createCatalogueItem` and `updateCatalogueItem`.

**The dropdown shows `label`. The write stores `key`.** Never the same variable.

## Task 5 — Regenerate types and drop the casts

`catalogue_items` writes are littered with `as never` — that is exactly why the missing `equipment_type` column would fail silently at runtime instead of at compile time. After the migration is applied, regenerate the Supabase types and **remove the `as never` casts from `settings/catalogue/actions.ts` and `catalogueQueries.ts`.** If a cast is still needed, say which and why; do not leave one in place quietly.

## Task 6 — App parity

`CURSOR_PROMPT_EQUIPMENT_SHOP_IN_APP.md` has not been run yet, so the app has no shop. Do not build it here. Instead:

- Register the shop routes in `scripts/parity-exceptions.json` with the reason `app shop pending CURSOR_PROMPT_EQUIPMENT_SHOP_IN_APP`, so the parity checker stops reporting a false pass. The equipment shop is currently website-only and the checker does not know it exists — that is a gap in the checker, not in the app.
- When that prompt is run later, it must include Tasks 1–4 of this file. Add a line saying so at the top of it.

---

## Do not

- Do not flip `is_active` or `is_client_visible` on any existing row via SQL. Matt decides which of the 12 starter items he actually sells, and turning them all on would publish 12 empty cards with no photo and no price.
- Do not touch `dogs`, pricing on dogs, `waiting_list` or `reservations`.
- Do not change `equipment_enquiries` or the quote flow.
- Do not revoke EXECUTE on `is_admin` or any function used in a row-level security policy.

---

## Report — real numbers, not descriptions

1. Screenshot of the editor on a **new** item showing the price field visible without touching anything.
2. Screenshot showing the **Active** checkbox and a **Reactivate** button on an inactive row.
3. `select count(*) from equipment_types;` — expect **13**.
4. Confirmation `catalogue_items.equipment_type` exists and the foreign key is there.
5. An insert with `equipment_type = 'nonsense'` is **refused** by the database. Paste the error.
6. Count of `as never` remaining on catalogue writes — expect **zero**, or name each one that stays and why.
7. `npx tsc --noEmit` clean in both repos.
8. `0170` present in both migration folders, byte-identical — show the diff.

**Then prove it end to end.** Create one real item — label "Leather collar", type `collar`, a price, a photo, Active ticked, Show in shop ticked — load `/shop` signed out, and confirm the card renders with the photo, the price and the words "Delivery cost excluded". Tell Matt the item you created so he can keep it or delete it. Do not leave test rows in production.
