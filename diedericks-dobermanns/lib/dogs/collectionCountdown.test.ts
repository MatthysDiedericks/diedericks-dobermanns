import assert from "node:assert/strict";

import { dogCollectionDate } from "./dogCollectionDate";

/** Run: npx tsx src/lib/dogs/collectionCountdown.test.ts */

function main() {
  assert.equal(
    dogCollectionDate({ status: "keep", handover_date: null, delivered_at: null }),
    null,
  );
  assert.equal(
    dogCollectionDate({
      status: "keep",
      handover_date: "2023-05-28",
      delivered_at: null,
    }),
    null,
  );
  assert.equal(
    dogCollectionDate({ status: "breeding_stock", handover_date: "2020-01-01", delivered_at: null }),
    null,
  );
  assert.equal(
    dogCollectionDate({ status: "sold", handover_date: "2024-06-01", delivered_at: null }),
    "2024-06-01",
  );
  assert.equal(
    dogCollectionDate({
      status: "sold",
      handover_date: "2024-06-01",
      delivered_at: "2024-06-03T10:00:00Z",
    }),
    "2024-06-03",
  );
  assert.equal(
    dogCollectionDate({ status: "sold", handover_date: null, delivered_at: null }),
    null,
  );
  console.log("collectionCountdown tests passed");
}

main();
