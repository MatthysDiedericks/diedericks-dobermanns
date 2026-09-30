import assert from "node:assert/strict";

import { expenseShareSentence } from "./dogProfitability";
import { formatAmount } from "./formatters";
import { allocationsBalance } from "./resolveAllocations";
import {
  equalSelectedShares,
  groupDogsForPicker,
  planSelectedSplit,
  type PickerDog,
} from "./selectedSplit";

function dog(partial: Partial<PickerDog> & Pick<PickerDog, "id" | "name">): PickerDog {
  return {
    birthOrder: null,
    litterId: null,
    litterLabel: null,
    status: "keep",
    category: null,
    date_of_birth: "2020-01-01",
    ownership_status: "kennel",
    ownership_status_at: null,
    deceased_at: null,
    outcome: null,
    outcome_date: null,
    ...partial,
  };
}

const amy = dog({
  id: "amy",
  name: "Amy",
  birthOrder: 1,
  litterId: "litter-a",
  litterLabel: "Litter A",
  status: "available",
});
const zara = dog({
  id: "zara",
  name: "Zara",
  birthOrder: 1,
  litterId: "litter-a",
  litterLabel: "Litter A",
  status: "available",
});
const cara = dog({
  id: "cara",
  name: "Cara",
  birthOrder: 2,
  litterId: "litter-b",
  litterLabel: "Litter B",
  status: "in_training",
});

const planned = planSelectedSplit({
  amount: 1000,
  expenseDate: "2026-09-30",
  dogs: [cara, zara, amy],
  uneven: false,
});

assert.ok(!("error" in planned));
if (!("error" in planned)) {
  assert.deepEqual(
    planned.shares.map((share) => share.dogId),
    ["amy", "zara", "cara"],
  );
  assert.deepEqual(
    planned.shares.map((share) => share.amount),
    [333.34, 333.33, 333.33],
  );
  assert.equal(new Set(planned.shares.map((share) => share.litterId)).size, 2);
  assert.ok(allocationsBalance(1000, planned.shares.map((share) => share.amount)));
  assert.equal(planned.shares[0].weight, 1);
  assert.equal(planned.shares[0].basisNote, "Split equally across 3 selected dogs");
}

const uneven = planSelectedSplit({
  amount: 1000,
  expenseDate: "2026-09-30",
  dogs: [amy, cara],
  uneven: true,
  amountsById: { amy: 400, cara: 500 },
});
assert.ok("error" in uneven);

const exact = planSelectedSplit({
  amount: 1000,
  expenseDate: "2026-09-30",
  dogs: [amy, cara],
  uneven: true,
  amountsById: { amy: 400, cara: 600 },
});
assert.ok(!("error" in exact));

const left = dog({
  id: "sold",
  name: "Sold Dog",
  status: "sold",
  ownership_status: "with_owner",
  ownership_status_at: "2020-06-01",
});
const blocked = planSelectedSplit({
  amount: 100,
  expenseDate: "2026-09-30",
  dogs: [left],
  uneven: false,
});
assert.ok("error" in blocked);
if ("error" in blocked) assert.match(blocked.error, /Sold Dog had already left/);

const groups = groupDogsForPicker([
  dog({ id: "queen", name: "Queen", status: "keep" }),
  amy,
  zara,
  cara,
  dog({
    id: "boarder",
    name: "Boarder",
    status: "in_training",
    ownership_status: "with_owner",
    ownership_status_at: null,
  }),
]);
assert.deepEqual(groups.kennel.map((row) => row.id), ["queen"]);
assert.equal(groups.litters.length, 2);
assert.deepEqual(
  groups.litters.find((litter) => litter.id === "litter-a")?.puppies.map((row) => row.id),
  ["amy", "zara"],
);
assert.deepEqual(groups.training.map((row) => row.id), ["boarder"]);
assert.ok(!groups.kennel.some((row) => row.id === "cara"));

const shares = equalSelectedShares(1000, [amy, zara, cara]);
assert.equal(shares[0].amount, 333.34);

const sentence = expenseShareSentence(
  {
    amount: 1400,
    sourceAmount: 9800,
    description: "vet visit",
    kind: "selected",
    basis: "Split equally across 7 selected dogs",
  },
  formatAmount,
);
assert.ok(sentence);
assert.match(sentence ?? "", /share of/);
assert.match(sentence ?? "", /vet visit, split across 7 dogs/);

console.log("selected split: 333.34 / 333.33 / 333.33 across two litters");
console.log(sentence);
