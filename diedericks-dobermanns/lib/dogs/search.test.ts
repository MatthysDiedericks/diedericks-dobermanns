import assert from "node:assert/strict";

import {
  dogsMatching,
  groupDogSearch,
  isMicrochipQuery,
  isYearQuery,
  matchDogs,
  matchReasons,
  noDogMatchLine,
} from "./search";

/** Run: npx tsx src/lib/dogs/search.test.ts */

type D = {
  id: string;
  name: string;
  call_name?: string | null;
  registered_name?: string | null;
  sex?: string | null;
  colour?: string | null;
  collar_colour?: string | null;
  microchip_number?: string | null;
  registration_number?: string | null;
  date_of_birth?: string | null;
  litter_id?: string | null;
  litter_name?: string | null;
  litterName?: string | null;
  litter_letter?: string | null;
  litter_date?: string | null;
  father_id?: string | null;
  mother_id?: string | null;
  buyer_name?: string | null;
  status?: string | null;
  birth_order?: number | null;
};

const claire: D = {
  id: "claire",
  name: "Claire",
  sex: "female",
  colour: "black_tan",
  status: "keep",
  date_of_birth: "2019-04-01",
};
const santini: D = {
  id: "santini",
  name: "Santini",
  sex: "male",
  colour: "black_tan",
  status: "stud",
  date_of_birth: "2018-01-01",
};
const pink: D = {
  id: "pink",
  name: "Puppy 1 (Pink)",
  call_name: "Peaches",
  sex: "female",
  colour: null,
  collar_colour: "pink",
  microchip_number: null,
  date_of_birth: "2026-07-10",
  litter_id: "js",
  litter_name: "Claire × Santini",
  litter_letter: "J",
  litter_date: "2026-07-10",
  mother_id: "claire",
  father_id: "santini",
  buyer_name: "Josef Kotse",
  status: "sold",
  birth_order: 1,
};
const blue: D = {
  id: "blue",
  name: "Puppy 2 (Blue)",
  sex: "male",
  colour: "black_tan",
  collar_colour: "blue",
  microchip_number: "123456789012345",
  date_of_birth: "2026-07-10",
  litter_id: "js",
  litter_name: "Claire × Santini",
  litter_letter: "J",
  litter_date: "2026-07-10",
  mother_id: "claire",
  father_id: "santini",
  status: "available",
  birth_order: 2,
};

const dogs: D[] = [claire, santini, pink, blue];

function main() {
  assert.equal(matchReasons(pink, "").length, 0);
  assert.equal(dogsMatching(dogs, "").length, 4);

  // Name
  assert.ok(matchReasons(claire, "claire").includes("name"));
  assert.ok(matchReasons(pink, "peaches").includes("call_name"));

  // DogPicker baseline: colour and sex
  const black = dogsMatching(dogs, "black");
  assert.ok(black.some((d) => d.id === "claire"));
  assert.ok(black.some((d) => d.id === "blue"));
  assert.ok(matchReasons(claire, "female").includes("sex"));
  assert.ok(matchReasons(santini, "male").includes("sex"));
  assert.ok(matchReasons(blue, "black").includes("colour"));

  // Collar
  assert.ok(matchReasons(pink, "pink").includes("collar"));

  // Litter name (DogPicker litterName) and letter
  assert.ok(matchReasons(pink, "claire × santini").includes("litter"));
  const letterJ = dogsMatching(dogs, "j");
  assert.ok(letterJ.some((d) => d.id === "pink"));

  // Registration (DogSelectField)
  const withReg: D = { ...santini, registration_number: "ZA-99" };
  assert.ok(matchReasons(withReg, "za-99").includes("registration"));

  // Microchip 15 digits — exact
  assert.equal(isMicrochipQuery("123456789012345"), true);
  const chip = groupDogSearch(dogs, "123456789012345");
  assert.equal(chip[0]?.kind, "microchip");
  assert.equal(chip[0]?.dogs[0]?.id, "blue");
  assert.equal(groupDogSearch(dogs, "000000000000000")[0]?.dogs.length, 0);

  // Year
  assert.equal(isYearQuery("2026"), 2026);
  assert.equal(isYearQuery("1989"), null);
  const born = groupDogSearch(dogs, "2026");
  assert.equal(born[0]?.kind, "year");
  assert.ok(born[0]?.dogs.some((d) => d.id === "pink"));
  assert.ok(!born[0]?.dogs.some((d) => d.id === "claire"));

  // Dam / sire offspring grouped by litter
  const claireGroups = groupDogSearch(dogs, "Claire");
  assert.ok(claireGroups.some((g) => g.kind === "dam"));
  const dam = claireGroups.find((g) => g.kind === "dam")!;
  assert.match(dam.heading, /DAM · Claire/);
  assert.equal(dam.litters[0]?.puppies.length, 2);
  assert.ok(claireGroups.some((g) => g.kind === "name"));

  const sireGroups = groupDogSearch(dogs, "Santini");
  assert.ok(sireGroups.some((g) => g.kind === "sire"));

  // Litter letter
  const litter = groupDogSearch(dogs, "J");
  assert.ok(litter.some((g) => g.kind === "litter"));

  // Buyer
  const buyer = groupDogSearch(dogs, "Josef Kotse");
  assert.ok(buyer.some((g) => g.kind === "buyer"));
  assert.equal(buyer.find((g) => g.kind === "buyer")?.dogs[0]?.id, "pink");
  assert.ok(buyer.find((g) => g.kind === "buyer")?.heading.includes("Josef Kotse"));

  // Empty state copy
  assert.match(noDogMatchLine("xyz"), /Nothing matches 'xyz'/);
  assert.match(noDogMatchLine("xyz"), /microchips/);

  // matchDogs returns reasons
  const hits = matchDogs(dogs, "female");
  assert.ok(hits.every((h) => h.reasons.length > 0));

  console.log("search.test.ts ok");
}

main();
