import assert from "node:assert/strict";

import { isBreedingDog } from "./breeding";
import { isKennelDog } from "./kennel";

/** Run: npx tsx lib/dogs/breeding.test.ts */

assert.equal(isBreedingDog({ status: "keep", hasProducedLitter: false }), true);
assert.equal(isBreedingDog({ status: "stud", hasProducedLitter: false }), true);
assert.equal(isBreedingDog({ status: "deceased", hasProducedLitter: true }), true);
assert.equal(isBreedingDog({ status: "deceased", hasProducedLitter: false }), false);
assert.equal(isBreedingDog({ status: "sold", hasProducedLitter: false }), false);
assert.equal(isBreedingDog({ status: "sold", hasProducedLitter: true }), true);
assert.equal(isBreedingDog({ status: "in_training", hasProducedLitter: false }), false);
assert.equal(isBreedingDog({ status: "available" }), false);

assert.equal(isKennelDog({ status: "deceased" }), false);
assert.equal(isBreedingDog({ status: "deceased", hasProducedLitter: true }), true);

console.log("breeding tests passed");
