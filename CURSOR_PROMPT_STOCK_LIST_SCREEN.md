# Cursor Prompt — Stock list screen (website admin + app)

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericksdobermann-web` and `diedericks-dobermanns`. **Same screen on both.** This is a parity feature, not website-only.
3. **Run `CURSOR_PROMPT_SHOP_PRICING_AND_ITEM_TYPES.md` first if it has not been run.** That one adds the price field, the Active switch and `equipment_type`. This screen displays those, so it needs them to exist.
4. **No new migration.** Everything below reads columns that already exist, or that `0170` adds.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Why this exists

Matt loaded equipment for sale and none of it appeared. There was no screen anywhere that answers the only question that matters: **what is loaded, and is it actually reaching the shop?**

`/admin/settings/catalogue` is a settings editor. It is buried, it is grouped by business category, and its status text is a grey run-on line. It is not a stock list.

The shop requires **both** `is_active` and `is_client_visible` to be true. Twelve items are currently loaded and **zero** are visible, and nothing on screen says why. That is the gap.

---

## Task 1 — Website: `/admin/stock`

New route: `src/app/admin/(panel)/stock/page.tsx` plus a client component. **Put it in the main admin navigation next to Equipment — not under Settings.** Stock is daily work; settings are not.

Server-side, fetch every catalogue item plus its quote usage:

```sql
select ci.*,
       (select count(*) from quote_items qi where qi.catalogue_code = ci.code) as quote_lines
from catalogue_items ci
order by ci.is_active desc, ci.is_client_visible desc, ci.sort_order, ci.label
```

Use a typed query in `src/lib/finance/catalogueQueries.ts` — `fetchStockList()` — not raw SQL in the page. Reuse the existing `SELECT` constant and add the `quote_lines` count.

### Counters across the top

Five numbers, computed from the same rows. No second query.

| Counter | Rule |
|---|---|
| **Live in shop** | `is_active && is_client_visible && image_path` |
| **In shop, no photo** | `is_active && is_client_visible && !image_path` |
| **Internal only** | `is_active && !is_client_visible` |
| **Inactive** | `!is_active` |
| **Total items** | all rows |

### The table

Columns: **Item** · **Code** · **Type** · **Price** · **Status** · **On quotes** · **Updated**.

- **Item** — label, with the short description under it in small muted text. If `notes` contains `[starter]`, add a small line: *"Starter suggestion — not loaded by you."* Those 12 rows are seeded examples from 13 August and Matt should be able to tell them apart at a glance.
- **Price** — the amount, or *"On request"* when `price_varies`. Never a blank cell.
- **Status** — one badge, plus a plain-English reason underneath when it is not live:
  - green **Live in shop**
  - amber **In shop — no photo** → *"Showing publicly with no product picture."*
  - grey **Internal only** → *"Used on quotes, hidden from the public shop."*
  - red **Inactive** → *"Switched off. It cannot reach the shop until Active is on."*
- **On quotes** — the count. When it is above zero, show a small warning line **"Do not delete"**. `delivery_travel` is on **11 real quote lines** right now; deleting it would break those quotes.

Sortable by clicking any column header. Filter buttons above the table: **All · Live in shop · No photo · Internal only · Inactive**.

### Row actions

- **Edit** — link straight to that item in the catalogue editor. Deep-link to the row, do not just open the settings page.
- **Activate / Deactivate** — toggle `is_active` in place, no page change.
- **Show in shop / Hide** — toggle `is_client_visible` in place.

Both toggles reuse the server actions from `settings/catalogue/actions.ts`. Do not write a second set of update functions. If `reactivateCatalogueItem` does not exist yet, it comes from the other prompt.

**Deleting is not on this screen.** An item on a quote must not be removable by accident. If Matt needs to clear the starter rows he will ask, and it will be done deliberately.

---

## Task 2 — App: the same screen

`app/(admin)/stock.tsx` in `diedericks-dobermanns`, using the app's existing admin list patterns and the Gold / Black / White styling. Same data, same counters, same badges, same reasons, same two toggles.

On a phone a wide table does not work. Use **cards**: label and short description on top, then a status badge, then price and quote count on one row, with the two toggles as switches. The filter buttons become a horizontal scrolling chip row.

Share the status logic. Put `stockStatusFor(item)` — returning `{ key, label, reason }` — in `lib/equipment/display.ts` (website) and the app equivalent, and have both screens call it. **The rules must not be written twice.** Two copies of a rule is how the shop ended up with twelve invisible items in the first place.

---

## Task 3 — Register it with the parity checker

Add `/admin/stock` to both sides so `scripts/check-parity.mjs` sees it as a matched pair, not an exception.

While you are there: the equipment shop routes are currently website-only and are **not** recorded in `scripts/parity-exceptions.json`, so the checker reports a false pass. Record them with the reason `app shop pending CURSOR_PROMPT_EQUIPMENT_SHOP_IN_APP`.

---

## Do not

- Do not add a stock quantity column or an inventory count. Matt has not asked for one and `stock_status` (in stock / made to order / sold out) covers today's need. Say if you think it is needed; do not build it.
- Do not change `catalogue_items` schema. No migration in this prompt.
- Do not touch the public `/shop` page, `equipment_enquiries`, or the quote flow.
- Do not delete or deactivate any existing row.
- Do not build this as a modal inside Settings. It is its own screen in both places.

---

## Report — real numbers, not descriptions

1. Screenshot of `/admin/stock` on the live data. It should read **0 live · 0 no photo · 0 internal · 12 inactive · 12 total**, and every row should carry the "Starter suggestion" line.
2. Screenshot of the app screen showing the same five counters.
3. Confirmation that `delivery_travel` shows **11** under "On quotes" with the "Do not delete" warning.
4. Proof both screens call the same `stockStatusFor()` — paste the import line from each.
5. `node scripts/check-parity.mjs --strict` passing with `/admin/stock` matched on both sides.
6. `npx tsc --noEmit` clean in both repos.

**Then prove it works.** Toggle one starter item to Active + Show in shop from the stock screen, confirm the counters move and the badge changes to amber "In shop — no photo", load `/shop` signed out and confirm it appears, then toggle it back off. Tell Matt which item you used.
