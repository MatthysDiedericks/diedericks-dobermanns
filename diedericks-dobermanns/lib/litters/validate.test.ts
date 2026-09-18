import assert from "node:assert/strict";

import {
  firstLitterError,
  generateLitterName,
  nextLitterLetter,
  validateLitter,
  type LitterDogRef,
} from "./validate";

/** Run: npx tsx lib/litters/validate.test.ts */

const cait: LitterDogRef = {
  id: "cait",
  name: "Cait",
  sex: "female",
  status: "deceased",
  deceased_at: "2025-01-01",
};

const ade: LitterDogRef = {
  id: "ade",
  name: "Ade",
  sex: "male",
  status: "sold",
  deceased_at: null,
};

const claire: LitterDogRef = {
  id: "claire",
  name: "Claire",
  sex: "female",
  status: "keep",
  deceased_at: null,
};

const santini: LitterDogRef = {
  id: "santini",
  name: "Santini",
  sex: "male",
  status: "stud",
  deceased_at: null,
};

function main() {
  assert.equal(
    generateLitterName("Claire", "Santini", "2026-07-12"),
    "Claire × Santini – Jul 2026",
  );
  assert.equal(generateLitterName("Claire", "", "2026-07-12"), null);
  assert.equal(nextLitterLetter(["A", "C"]), "B");
  assert.equal(nextLitterLetter(["A", "B", "C"]), "D");

  const deceasedDam = validateLitter({
    name: "Cait × Ade – Sep 2026",
    status: "planned",
    mother_id: cait.id,
    father_id: santini.id,
    expected_date: "2026-09-15",
    actual_date: "",
    dam: cait,
    sire: santini,
  });
  assert.equal(
    deceasedDam.some(
      (p) => p.message === "Cait is recorded as deceased and cannot be a dam",
    ),
    true,
  );

  const soldSire = validateLitter({
    name: "Claire × Ade – Sep 2026",
    status: "planned",
    mother_id: claire.id,
    father_id: ade.id,
    expected_date: "2026-09-15",
    dam: claire,
    sire: ade,
  });
  assert.equal(
    soldSire.some(
      (p) => p.message === "Ade is recorded as sold and cannot be a sire.",
    ),
    true,
  );

  const plannedWithBirth = validateLitter({
    name: "Claire × Santini – Sep 2026",
    status: "planned",
    mother_id: claire.id,
    father_id: santini.id,
    actual_date: "2026-09-15",
    dam: claire,
    sire: santini,
  });
  assert.equal(
    plannedWithBirth.some((p) =>
      p.message.includes("A planned litter cannot have a birth date"),
    ),
    true,
  );

  const unnamed = validateLitter({
    name: "",
    status: "planned",
    mother_id: claire.id,
    father_id: santini.id,
    expected_date: "2026-07-01",
    dam: claire,
    sire: santini,
  });
  assert.equal(
    unnamed.some((p) => p.message.includes("will show as LITTER")),
    true,
  );

  const historicalDam = validateLitter({
    name: "Cait × Santini – Jan 2024",
    status: "born",
    mother_id: cait.id,
    father_id: santini.id,
    actual_date: "2024-01-10",
    dam: cait,
    sire: santini,
    includeRetiredAndDeceasedDams: true,
  });
  assert.equal(
    historicalDam.some((p) => p.field === "mother_id"),
    false,
  );

  const editKeepsDeceasedDam = validateLitter({
    name: "Cait × Santini – Jan 2024",
    status: "born",
    mother_id: cait.id,
    father_id: santini.id,
    actual_date: "2024-01-10",
    dam: cait,
    sire: santini,
    existingMotherId: cait.id,
    existingFatherId: santini.id,
  });
  assert.equal(editKeepsDeceasedDam.length, 0);

  const ok = validateLitter({
    name: "Claire × Santini – Jul 2026",
    status: "born",
    mother_id: claire.id,
    father_id: santini.id,
    actual_date: "2026-07-12",
    dam: claire,
    sire: santini,
  });
  assert.equal(ok.length, 0);
  assert.equal(firstLitterError(ok), undefined);

  const archivedNeedsDate = validateLitter({
    name: "Claire × Santini – Jul 2026",
    status: "archived",
    mother_id: claire.id,
    father_id: santini.id,
    actual_date: "",
    dam: claire,
    sire: santini,
    existingMotherId: claire.id,
    existingFatherId: santini.id,
  });
  assert.equal(
    archivedNeedsDate.some((p) => p.message.includes("actual birth date")),
    true,
  );

  const availableIsNotBorn = validateLitter({
    name: "Claire × Santini – Jul 2026",
    status: "available",
    mother_id: claire.id,
    father_id: santini.id,
    actual_date: "",
    dam: claire,
    sire: santini,
    existingMotherId: claire.id,
    existingFatherId: santini.id,
  });
  assert.equal(
    availableIsNotBorn.some((p) => p.field === "actual_date"),
    false,
  );

  console.log("validate.test.ts ok");
}

main();
