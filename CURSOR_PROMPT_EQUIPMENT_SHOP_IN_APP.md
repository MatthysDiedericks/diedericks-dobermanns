# Cursor Prompt — Bring the equipment shop into the app

**Must include Tasks 1–4 of `CURSOR_PROMPT_SHOP_PRICING_AND_ITEM_TYPES.md`** (price field always visible, Active/Reactivate, delivery-excluded note, equipment item types from the `equipment_types` lookup). Do not ship the app shop without those four.

## Do this first

1. Read the whole file before changing anything.
2. This is **app-only work**: `diedericks-dobermanns`. The website already has the shop and is the reference implementation — **do not change the website's behaviour.**
3. **No database migration.** Everything needed is already live: `catalogue_items` (with `image_path`, `short_description`, `is_client_visible`, `stock_status`), `equipment_enquiries`, `equipment_enquiry_items`, and the `submit_equipment_enquiry` function. Do **not** create tables, policies or functions.
4. Do not write test rows into production. No test enquiries, no test catalogue items.
5. Finish with `npx tsc --noEmit` in the app repo and paste the real output.

---

## Why this exists

The equipment shop shipped on the website on 8 Sep 2026 and has no app equivalent. The parity checker currently reports "in parity" only because the shop routes were never registered with it — so this is a real one-sided feature hiding behind a passing check.

Standing rule on this project: the website and the app have the same functions.

---

## The reference implementation — read these before writing anything

Website files. Mirror their **behaviour**, not their markup:

| File | What it does |
|---|---|
| `src/app/(site)/shop/page.tsx` | public shop route |
| `src/components/shop/ShopClient.tsx` | grid, basket, enquiry form |
| `src/app/(site)/shop/actions.ts` | calls `submit_equipment_enquiry` |
| `src/lib/equipment/queries.ts` | fetches visible catalogue items |
| `src/lib/equipment/display.ts` | price and stock formatting |
| `src/lib/equipment/types.ts` | shared types |
| `src/app/admin/(panel)/equipment/page.tsx` | admin catalogue + enquiries |
| `src/app/admin/(panel)/equipment/[id]/page.tsx` | one enquiry |
| `src/app/admin/(panel)/equipment/actions.ts` | convert enquiry to quote |
| `src/app/admin/(panel)/equipment/EquipmentEnquiryActions.tsx` | admin actions |

**Read `display.ts` and reuse its rules rather than reinventing them** — particularly how it renders `price_varies` and `stock_status`. If the two platforms format a price differently, that is a bug.

---

## Task 1 — Public shop screen

Create `app/(public)/shop.tsx`, following the pattern of the existing public screens (`app/(public)/gallery.tsx`, `app/(public)/dogs/index.tsx`).

- Grid of cards: image from the `equipment` storage bucket, `label`, `short_description`, price.
- **When `price_varies` is true, show "Price on request"** — never a number, never R0.
- Show `stock_status` when it is not `in_stock`.
- Only items where `is_active` **and** `is_client_visible` are true. The database enforces this too, but the query should say so.
- Basket held in component state, with quantities.
- Copy near the submit button must read: **"Not an order. We reply with a quote."**

**There are currently 0 client-visible items**, so build and test the empty state properly: *"Nothing in the shop just yet. Please check back shortly."* — the same wording the website uses. Do not ship a screen that only looks right with data.

### The enquiry form

Required: **full name** (one field — `contacts.full_name` is a single column, do not split it), **email**, **mobile**.

Delivery or collection toggle. **Delivery address is required only when delivery is chosen** — hide the field entirely for collection.

Optional message.

**Consent checkbox, unticked by default, and a separate control from any terms acceptance.** Wording, matching the website exactly:

> Send me news about upcoming litters, available dogs and equipment. You can stop this at any time.

Pre-ticking it, or bundling it with terms, makes the consent invalid and is the whole reason it exists.

### Signed-in clients

Prefill name, email and phone from their contact and show a compact summary with an Edit control — not empty boxes. This is what the website does and it is what stops a second contact record being created for someone who already exists.

### Submission

Call the existing function via RPC:

```ts
supabase.rpc('submit_equipment_enquiry', {
  p_full_name, p_email, p_phone, p_fulfilment, p_address, p_message, p_marketing, p_items
})
```

`p_items` is `[{ catalogue_item_id, quantity }]`.

**Do not insert into `equipment_enquiries` or `equipment_enquiry_items` directly.** Anonymous users have no grant on those tables — a direct insert will fail, and it would also skip the contact-matching and rate-limiting that live inside the function.

The function is rate limited to **10 per hour and 30 per day**. When it raises that error, show the message it returns rather than a generic failure — it tells the person to WhatsApp instead.

---

## Task 2 — Admin screens

Create `app/(admin)/equipment/index.tsx` and `app/(admin)/equipment/[id].tsx`, following `app/(admin)/enquiries.tsx` and `app/(admin)/waitlist/index.tsx` for structure.

**Catalogue manager:** create and edit items — `label`, `short_description`, `default_price`, `price_varies`, `is_client_visible`, `stock_status`, `sort_order`, and image upload to the `equipment` bucket (5 MB cap, jpeg/png/webp only — the bucket enforces this, but fail politely rather than crashing).

**Enquiries list:** new / quoted / closed, showing items, contact and fulfilment method.

**Convert to quote:** reuse the existing quote builder. Build a `quotes` row with one `quote_items` line per enquiry item, taking `default_price` and `description_template` from the catalogue, then set `equipment_enquiries.quote_id` and `status = 'quoted'`. Do not write a second quoting path.

Add Equipment to the admin navigation in the same place the website has it.

---

## Task 3 — Register the routes with the parity checker

This is the step that stops it happening again.

`scripts/check-parity.mjs` did not see the shop on either side, so a one-sided feature passed as "in parity". Once both platforms have the screens, confirm the checker picks them up and reports them as matched — **not** as a new exception. Run it and paste the output:

```
node scripts/check-parity.mjs
```

If a genuine shape difference remains (for example the app splits the basket onto its own screen), record it in `scripts/parity-exceptions.json` with a one-line reason in the same voice as the existing entries. Do **not** use an exception to paper over a screen you simply did not build.

---

## What NOT to change

- Do not touch `applications`, `waiting_list`, `reservations` or `pipeline_stage`. Equipment must never affect a queue position or a puppy allocation.
- Do not add any database object. Everything is live already.
- Do not apply the `dogs.price` column lock to `catalogue_items` — equipment prices are published on purpose.
- Do not send any email from this work, and do not touch `campaigns`.
- Do not pre-tick the consent box.
- Do not change the website.

---

## Acceptance checks — report the real number for each

1. `npx tsc --noEmit` clean in the app repo. Paste the output.
2. `node scripts/check-parity.mjs` — paste the full summary. Shop and equipment screens must appear as **matched**, and the totals should move from 135/127.
3. Grep the app repo: zero reads or writes to `waiting_list`, `reservations` or `pipeline_stage` from any equipment file. Say what you searched.
4. Confirm the app inserts into **neither** enquiry table directly, and that `submit_equipment_enquiry` is the only write path.
5. Confirm the consent checkbox defaults to unticked and is separate from terms.
6. Confirm you added no database object and ran nothing against the live database.

**Then the check that matters:** with 0 client-visible items, open the shop screen in the app signed out and confirm it shows the empty state rather than a blank screen or a crash. Then have Matt tick one item visible in admin and confirm it appears in both the app and the website with the same price formatting.
