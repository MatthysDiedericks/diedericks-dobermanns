import assert from "node:assert/strict";

import {
  includeOnMyDogs,
  isKennelDog,
  kennelCountLine,
  kennelSectionHeading,
  splitBySex,
  toKennelCard,
  visibleMyDogs,
} from "./kennel";

/** Run: npx tsx lib/dogs/kennel.test.ts */

const KENNEL = ["keep", "stud", "in_training", "available"] as const;

for (const status of KENNEL) {
  assert.equal(isKennelDog(status), true, status);
  assert.equal(isKennelDog({ status }), true, status);
}

for (const status of ["sold", "deceased", "reserved"]) {
  assert.equal(isKennelDog(status), false, status);
  assert.equal(isKennelDog({ status }), false, status);
}

assert.equal(isKennelDog({ status: "keep", programme_tier: null } as { status: string }), true);
assert.equal(
  isKennelDog({ status: "sold", ownership_status: "kennel" } as { status: string }),
  false,
);

/**
 * The kennel roster as checked against the live statuses: 9 females, 6 males.
 * Sold, reserved and deceased stay off until the deceased toggle.
 */
const ROSTER: { name: string; sex: "female" | "male"; status: string }[] = [
  ...["Cendra", "Claire", "Cleopatra", "Cyrus", "Hailey", "Hannah", "Kim", "Odessa"].map(
    (name) => ({ name, sex: "female" as const, status: "keep" }),
  ),
  { name: "Jazzmine", sex: "female", status: "in_training" },
  ...["Dharka", "Hunter-King", "Santini"].map((name) => ({
    name,
    sex: "male" as const,
    status: "stud",
  })),
  { name: "Bruce", sex: "male", status: "in_training" },
  { name: "Eben", sex: "male", status: "in_training" },
  { name: "Zues", sex: "male", status: "available" },
  { name: "Sold pup", sex: "female", status: "sold" },
  { name: "On hold", sex: "male", status: "reserved" },
  { name: "Old stud", sex: "male", status: "deceased" },
];

const today = ROSTER.filter((dog) => includeOnMyDogs(dog, false));
assert.equal(today.length, 15);
const split = splitBySex(today.map((dog) => ({ ...dog, sex: dog.sex })));
assert.equal(split.females.length, 9);
assert.equal(split.males.length, 6);
assert.equal(kennelCountLine(today), "15 dogs · 9 females · 6 males");
assert.equal(kennelSectionHeading("Females", split.females.length), "Females · 9");
assert.equal(kennelSectionHeading("Males", split.males.length), "Males · 6");

assert.equal(
  ROSTER.filter((dog) => includeOnMyDogs(dog, false)).some((dog) => dog.status === "deceased"),
  false,
);
const withArchive = ROSTER.filter((dog) => includeOnMyDogs(dog, true));
assert.equal(withArchive.some((dog) => dog.status === "deceased"), true);
assert.equal(withArchive.some((dog) => dog.status === "sold"), false);

const now = new Date("2026-09-22T12:00:00+02:00");

const noPhoto = toKennelCard({
  now,
  dog: {
    id: "cyrus",
    name: "Cyrus of Somewhere",
    call_name: "Cyrus",
    sex: "female",
    status: "keep",
    date_of_birth: "2019-04-22",
    microchip_number: null,
    registration_number: null,
    media: [],
  },
  heats: [
    {
      heat_start_date: "2026-03-12",
      is_predicted: false,
      predicted_next_heat_date: "2026-09-04",
    },
  ],
});
assert.equal(noPhoto.photo.kind, "initial");
if (noPhoto.photo.kind === "initial") assert.equal(noPhoto.photo.letter, "C");
assert.equal(noPhoto.flags.includes("No photo"), true);
assert.equal(noPhoto.flags.includes("No microchip"), true);
assert.equal(noPhoto.flags.includes("No papers"), true);
assert.equal(noPhoto.href, "/admin/dogs/cyrus");
assert.match(noPhoto.detailLine ?? "", /Last heat/);
assert.match(noPhoto.detailLine ?? "", /next/);
assert.equal(noPhoto.chip, "♀ Brood");
assert.equal(noPhoto.age, "7y 5m");

const chipped = toKennelCard({
  now,
  dog: {
    id: "santini",
    name: "Santini",
    call_name: "Santini",
    registered_name: "Santini",
    sex: "male",
    status: "stud",
    microchip_number: "900123456789012",
    registration_number: "ZA-1",
    media: [{ url: "https://example.com/santini.jpg", is_primary: true }],
  },
  progeny: Array.from({ length: 14 }, (_, i) => ({
    id: `p${i}`,
    sex: "female",
    date_of_birth: "2024-01-01",
    litter_id: "litter-1",
  })),
});
assert.equal(chipped.photo.kind, "image");
assert.equal(chipped.flags.includes("No microchip"), false);
assert.equal(chipped.flags.includes("No photo"), false);
assert.equal(chipped.registeredName, null);
assert.equal(chipped.detailLine, "14 pups bred");
assert.equal(chipped.href, "/admin/dogs/santini");

const deceased = toKennelCard({
  now,
  dog: {
    id: "old",
    name: "Old stud",
    sex: "male",
    status: "deceased",
    deceased_at: "2020-01-02",
    media: [],
  },
});
assert.equal(deceased.archived, true);
assert.equal(visibleMyDogs([noPhoto, deceased], false).some((card) => card.id === "old"), false);
assert.equal(visibleMyDogs([noPhoto, deceased], true).some((card) => card.id === "old"), true);
assert.match(deceased.archiveLabel ?? "", /Deceased/);

console.log("kennel.test.ts ok");
