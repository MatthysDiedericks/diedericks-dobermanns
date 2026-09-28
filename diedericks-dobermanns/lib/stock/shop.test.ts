import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertShopPayloadHasNoCost,
  mapShopProduct,
  shopInStockFromMovements,
  shopProductVisible,
} from "./shop";

/** Run: npx tsx lib/stock/shop.test.ts */

function readSql(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../supabase/migrations", name),
    join(here, "../../../supabase/migrations", name),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error(`${name} not found`);
}

function main() {
  const sql = readSql("0188_shop_products_no_cost.sql");
  const stockSql = readSql("0187_products_and_stock.sql");

  assert.match(sql, /drop policy if exists products_client_read_shop on public\.products/i);
  assert.doesNotMatch(sql, /create policy products_client_read_shop/i);
  assert.match(sql, /notify pgrst,\s*'reload schema'/i);

  const viewMatch = sql.match(
    /create or replace view public\.v_shop_products as([\s\S]*?)grant select/i,
  );
  assert.ok(viewMatch, "v_shop_products view body missing");
  const viewBody = viewMatch[1];
  assert.doesNotMatch(viewBody, /cost_price/i);
  assert.doesNotMatch(viewBody, /qty_on_hand/i);
  assert.doesNotMatch(viewBody, /security_invoker/i);
  assert.doesNotMatch(viewBody, /supplier_name|unit_cost/i);
  assert.match(viewBody, /p\.sell_price/);
  assert.match(viewBody, /p\.image_path/);
  assert.match(viewBody, /coalesce\(sum\(m\.quantity\), 0\) > 0 as in_stock/i);
  assert.match(viewBody, /where p\.is_active and p\.is_client_visible/i);

  assert.match(
    sql,
    /comment on view public\.v_shop_products is[\s\S]*Security definer by design[\s\S]*Do not set security_invoker/i,
  );

  assert.doesNotMatch(sql, /v_product_stock/);
  assert.doesNotMatch(sql, /create policy .*stock_movements/i);
  assert.doesNotMatch(sql, /create policy .*stock_receipt/i);
  assert.match(stockSql, /create policy stock_movements_admin_select/);
  assert.match(stockSql, /create policy stock_receipts_admin/);
  assert.match(stockSql, /create policy stock_receipt_lines_admin/);
  assert.doesNotMatch(stockSql, /create policy stock_movements_client/i);
  assert.doesNotMatch(stockSql, /create policy stock_receipts_client/i);
  assert.doesNotMatch(stockSql, /create policy stock_receipt_lines_client/i);
  assert.match(
    stockSql,
    /create or replace view public\.v_product_stock\s+with \(security_invoker = true\)/i,
  );
  assert.match(stockSql, /as qty_on_hand/);
  assert.match(stockSql, /p\.\*/);

  assert.equal(shopProductVisible({ is_active: true, is_client_visible: true }), true);
  assert.equal(shopProductVisible({ is_active: false, is_client_visible: true }), false);
  assert.equal(shopProductVisible({ is_active: true, is_client_visible: false }), false);
  assert.equal(shopInStockFromMovements([]), false, "no movements → out of stock");
  assert.equal(shopInStockFromMovements([{ quantity: 3 }]), true);
  assert.equal(shopInStockFromMovements([{ quantity: 2 }, { quantity: -2 }]), false);

  const shopRow = {
    id: "p1",
    sku: "COLLAR-01",
    name: "Collar",
    category: "collar_lead",
    unit: "each",
    sell_price: 650,
    vat_rate: 15,
    image_path: "collar.jpg",
    short_description: "A collar",
    in_stock: false,
  };
  assert.doesNotThrow(() => assertShopPayloadHasNoCost(shopRow));
  const mapped = mapShopProduct(shopRow);
  assert.equal("cost_price" in mapped, false);
  assert.equal("qty_on_hand" in mapped, false);
  assert.equal(mapped.name, "Collar");
  assert.equal(mapped.sell_price, 650);
  assert.equal(mapped.in_stock, false);
  assert.equal(mapped.image_path, "collar.jpg");

  assert.throws(
    () =>
      assertShopPayloadHasNoCost({
        ...shopRow,
        cost_price: 180,
      }),
    /LEAK: cost_price is on the shop payload/,
  );
  assert.throws(
    () =>
      assertShopPayloadHasNoCost({
        ...shopRow,
        qty_on_hand: 3,
      }),
    /LEAK: qty_on_hand is on the shop payload/,
  );

  const clientPoliciesAfter = ["products_admin"];
  assert.equal(clientPoliciesAfter.includes("products_client_read_shop"), false);
  assert.equal(clientPoliciesAfter.length, 1);

  console.log("shop.test.ts ok");
}

main();
