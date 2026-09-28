import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyMovements,
  assertReceiptEditable,
  confirmReceiptOnce,
  needsReorder,
  onHandValue,
  planSale,
  qtyOnHand,
  STOCK_WOULD_GO_NEGATIVE,
  wouldGoNegative,
} from "./ledger";

/** Run: npx tsx src/lib/stock/ledger.test.ts */

function main() {
  const receive = { quantity: 14 };
  const sale = { quantity: -3 };
  const adjustment = { quantity: -1 };
  assert.equal(qtyOnHand([receive, sale, adjustment]), 10);

  const afterReceive = applyMovements(0, [{ quantity: 8 }]);
  assert.equal(afterReceive, 8);
  const afterSale = applyMovements(afterReceive, [{ quantity: -2 }]);
  assert.equal(afterSale, 6);
  const afterAdjust = applyMovements(afterSale, [{ quantity: 1 }]);
  assert.equal(afterAdjust, 7);

  const first = confirmReceiptOnce({
    status: "draft",
    alreadyPosted: false,
    lines: [
      { product_id: "collar", quantity: 6, unit_cost: 120 },
      { product_id: "lead", quantity: 4, unit_cost: 90 },
      { product_id: "tug", quantity: 4, unit_cost: 150 },
    ],
  });
  assert.equal(first.length, 3);
  assert.equal(qtyOnHand(first), 14);
  assert.ok(first.every((m) => m.movement_type === "receive" && m.quantity > 0));

  const second = confirmReceiptOnce({
    status: "confirmed",
    alreadyPosted: true,
    lines: first.map((m) => ({
      product_id: m.product_id,
      quantity: m.quantity,
      unit_cost: m.unit_cost ?? 0,
    })),
  });
  assert.equal(second.length, 0, "confirming twice must not double the stock");

  assert.throws(
    () => assertReceiptEditable("confirmed"),
    /confirmed receipt cannot be edited/i,
  );
  assert.doesNotThrow(() => assertReceiptEditable("draft"));

  assert.equal(wouldGoNegative(4, -5), true);
  assert.equal(wouldGoNegative(4, -4), false);

  const blocked = planSale({
    productId: "collar",
    onHand: 2,
    quantity: 5,
    unitCost: 120,
    invoiceId: "inv-1",
    allowNegative: false,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, STOCK_WOULD_GO_NEGATIVE);

  const overridden = planSale({
    productId: "collar",
    onHand: 2,
    quantity: 5,
    unitCost: 120,
    invoiceId: "inv-1",
    allowNegative: true,
    reason: "Counted short — sold the last five anyway",
  });
  assert.equal(overridden.ok, true);
  if (overridden.ok) {
    assert.equal(overridden.movements.length, 2);
    assert.equal(overridden.movements[0]?.movement_type, "adjustment");
    assert.equal(overridden.movements[1]?.movement_type, "sale");
    assert.equal(overridden.resulting, 0);
    assert.match(overridden.movements[0]?.reason ?? "", /override|counted short/i);
  }

  assert.equal(needsReorder(2, 5), true);
  assert.equal(needsReorder(6, 5), false);
  assert.equal(onHandValue([{ qty_on_hand: 10, cost_price: 80 }]), 800);

  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../supabase/migrations/0187_products_and_stock.sql"),
    join(here, "../../supabase/migrations/0187_products_and_stock.sql"),
  ];
  let sql = "";
  for (const path of candidates) {
    try {
      sql = readFileSync(path, "utf8");
      break;
    } catch {
      /* try next */
    }
  }
  if (!sql) throw new Error("0187_products_and_stock.sql not found");
  assert.match(
    sql,
    /create or replace view public\.v_product_stock\s+with \(security_invoker = true\)/i,
  );
  assert.doesNotMatch(sql, /v_product_stock[\s\S]{0,80}security_invoker\s*=\s*on/i);

  console.log("ledger.test.ts ok");
}

main();
