import assert from "node:assert/strict";

import {
  litterInGoHomeWindow,
  litterIncomeProgress,
  litterProgressLabel,
  shortlistSaleLitters,
  type SaleLitter,
} from "./litterCandidates";

/** Run: npx tsx lib/finance/litterCandidates.test.ts */

function litter(id: string, whelp: string | null, sold = 1, linked = false): SaleLitter {
  return {
    id,
    name: id,
    whelpDate: whelp,
    damName: "Dam",
    sireName: "Sire",
    sold,
    linked,
  };
}

assert.equal(litterInGoHomeWindow("2024-01-01", "2024-03-11"), true);
assert.equal(litterInGoHomeWindow("2024-01-01", "2024-02-01"), false);
assert.equal(litterInGoHomeWindow("2024-01-01", "2024-06-01"), false);
assert.equal(litterInGoHomeWindow("2024-05-01", "2024-04-01"), false);
assert.equal(litterInGoHomeWindow(null, "2024-04-01"), false);

const listed = shortlistSaleLitters("2024-04-01", [
  litter("ten-weeks", "2024-01-22"),
  litter("too-young", "2024-03-01"),
  litter("too-old", "2023-10-01"),
  litter("after", "2024-05-01"),
  litter("empty", null, 0),
]);
assert.deepEqual(
  listed.inWindow.map((row) => row.id),
  ["ten-weeks"],
);
assert.equal(listed.outside.some((row) => row.id === "after"), false);
assert.equal(listed.outside[0]?.id, "too-young");

const progress = litterIncomeProgress([
  litter("a", "2024-01-01", 4, true),
  litter("b", "2024-01-01", 2, false),
  litter("empty", "2024-01-01", 0, false),
]);
assert.deepEqual(progress, { linked: 1, total: 2 });
assert.equal(litterProgressLabel(18, 24), "18 of 24 litters have income linked");

console.log("litterCandidates tests passed");
