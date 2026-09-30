import assert from "node:assert/strict";

import {
  allocationBlockReason,
  attributeMatch,
  isAllocatablePuppy,
  livePuppySummary,
  noteNeedsReading,
  preferenceValueLabel,
  puppyChoiceLabel,
  supplyDemandSummary,
  tierChipLabel,
} from "./allocationDecision";

/** Run: npx tsx lib/waitlist/allocationDecision.test.ts */

const live = [
  { id: "1", name: "K1", sex: "female", colour: "black_tan", collar_colour: "orange", status: "available" },
  { id: "2", name: "K2", sex: "male", colour: "black_tan", collar_colour: "purple", status: "available" },
  { id: "3", name: "K3", sex: "female", colour: "black_tan", collar_colour: "pink", status: "available" },
  { id: "4", name: "K4", sex: "male", colour: "black_tan", collar_colour: "yellow", status: "available" },
  { id: "5", name: "K5", sex: "female", colour: "black_tan", collar_colour: "red", status: "available" },
  { id: "6", name: "K6", sex: "female", colour: "black_tan", collar_colour: "peach", status: "available" },
  {
    id: "7",
    name: "K7",
    sex: "male",
    colour: null,
    collar_colour: null,
    status: "deceased",
    outcome: "stillborn",
  },
];

function main() {
  assert.equal(isAllocatablePuppy(live[6]), false);
  assert.equal(isAllocatablePuppy({ status: "available", outcome: "stillborn" }), false);
  assert.equal(isAllocatablePuppy(live[0]), true);

  const offered = live.filter(isAllocatablePuppy);
  assert.equal(offered.some((p) => p.name === "K7"), false);
  assert.equal(puppyChoiceLabel(live[1]), "K2 · purple · male · black & tan");

  const summary = livePuppySummary(live);
  assert.match(summary.countLine, /^6 live pups — 2 male \(K2 purple, K4 yellow\)/);
  assert.match(summary.countLine, /4 female \(K1 orange, K3 pink, K5 red, K6 peach\)/);
  assert.equal(summary.colourLine, "All black & tan");
  assert.doesNotMatch(summary.countLine, /K7/);

  const buyers = [
    ...Array.from({ length: 8 }, (_, i) => ({
      preferred_sex: "male",
      preferred_category: i < 4 ? "elite_developed" : "standard",
      preferred_colour: i < 3 ? "brown_tan" : "black_tan",
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      preferred_sex: "female",
      preferred_category: i < 3 ? "elite_developed" : "standard",
      preferred_colour: i < 4 ? "brown_tan" : "black_tan",
    })),
  ];
  const demand = supplyDemandSummary(buyers, live);
  const byLabel = Object.fromEntries(demand.lines.map((line) => [line.label, line.value]));
  assert.equal(byLabel["Want a male"], "8");
  assert.equal(byLabel["Want a female"], "8");
  assert.match(byLabel["Males available"], /^2 \(K2 purple, K4 yellow\)/);
  assert.match(byLabel["Females available"], /^4 \(/);
  assert.equal(byLabel["Want Elite developed"], "7");
  assert.equal(byLabel["Want Standard"], "9");
  assert.match(demand.colourGaps.join(" "), /Brown & Tan/);

  assert.equal(tierChipLabel("elite_developed"), "Elite developed");
  assert.equal(tierChipLabel("standard"), "Standard");
  assert.equal(preferenceValueLabel(null, "ears"), "No preference");
  assert.equal(preferenceValueLabel("no_preference", "tail"), "No preference");
  assert.equal(preferenceValueLabel("docked", "tail"), "Docked");

  const wanda =
    "Ons wil graag 2 tewe bestel, en op waglys wees vir Oktober 2027 aangesien ons perseel eers dan gereed gaan wees.";
  assert.equal(noteNeedsReading(wanda), true);
  assert.equal(noteNeedsReading("We would prefer ear cropping if possible."), false);
  assert.equal(noteNeedsReading(null), false);

  const k2 = live[1];
  const maleBuyer = { preferred_sex: "male", preferred_colour: "black_tan", tail_preference: "docked", preferred_category: "elite_developed" };
  const maleLines = attributeMatch(maleBuyer, k2);
  assert.equal(maleLines.find((l) => l.key === "sex")?.mark, "met");
  assert.equal(maleLines.find((l) => l.key === "colour")?.mark, "met");
  assert.equal(maleLines.find((l) => l.key === "tail")?.mark, "unknown");
  assert.match(maleLines.find((l) => l.key === "tail")?.text ?? "", /not yet decided/);
  assert.equal(maleLines.find((l) => l.key === "tier")?.mark, "unknown");
  assert.match(maleLines.find((l) => l.key === "tier")?.text ?? "", /not yet tiered/);

  const femaleOnMale = attributeMatch({ preferred_sex: "female", preferred_colour: "brown_tan" }, k2);
  assert.equal(femaleOnMale.find((l) => l.key === "sex")?.mark, "block");
  assert.equal(femaleOnMale.find((l) => l.key === "colour")?.mark, "miss");

  assert.match(
    allocationBlockReason({ puppy: live[6], preferredSex: "male" }) ?? "",
    /cannot be allocated/,
  );
  assert.match(
    allocationBlockReason({ puppy: k2, preferredSex: "female" }) ?? "",
    /Sex does not match/,
  );
  assert.equal(
    allocationBlockReason({
      puppy: k2,
      preferredSex: "female",
      sexOverride: "Client confirmed they will take this male.",
    }),
    null,
  );
  assert.equal(allocationBlockReason({ puppy: k2, preferredSex: "male" }), null);

  console.log("allocationDecision.test.ts ok");
}

main();
