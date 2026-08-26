import assert from "node:assert/strict";

import {
  buildHealthCalendar,
  type DewormingLike,
  type VaccinationLike,
} from "./healthCalendar";

/** Run: npx tsx lib/dogs/healthCalendar.test.ts */

const NOW = new Date("2026-08-26T12:00:00");

const PINK_DEWORMING: DewormingLike[] = [
  {
    id: "d1",
    product_name: "Antizol",
    treatment_date: "2026-07-24",
    next_due_date: "2026-08-07",
    treatment_type: "deworming",
  },
  {
    id: "d2",
    product_name: "Antizol",
    treatment_date: "2026-08-07",
    next_due_date: "2026-08-20",
    treatment_type: "deworming",
  },
  {
    id: "d3",
    product_name: "Antizol",
    treatment_date: "2026-08-20",
    next_due_date: "2026-09-03",
    treatment_type: "deworming",
  },
];

function main() {
  const pink = buildHealthCalendar([], PINK_DEWORMING, NOW);
  const wormDue = pink.upcoming.filter((u) => u.kind === "deworming");
  assert.equal(wormDue.length, 1, "satisfied earlier doses must not appear as due");
  assert.equal(wormDue[0]?.dueDate, "2026-09-03");
  assert.equal(pink.history.length, 3, "all three rows stay in history");

  const missed: DewormingLike[] = [
    {
      id: "missed",
      product_name: "Antizol",
      treatment_date: "2026-07-01",
      next_due_date: "2026-07-15",
      treatment_type: "deworming",
    },
  ];
  const genuine = buildHealthCalendar([], missed, NOW);
  assert.equal(genuine.upcoming.length, 1);
  assert.equal(genuine.upcoming[0]?.dueDate, "2026-07-15");
  assert.ok((genuine.upcoming[0]?.daysUntil ?? 0) < 0, "missed treatment is overdue");

  const single: VaccinationLike[] = [
    {
      id: "v1",
      vaccine_name: "Nobivac DHPPi",
      date_administered: "2026-08-20",
      next_due_date: "2026-09-02",
    },
  ];
  const one = buildHealthCalendar(single, [], NOW);
  assert.equal(one.upcoming.length, 1);
  assert.equal(one.upcoming[0]?.dueDate, "2026-09-02");
  assert.equal(one.history.length, 1);

  console.log("healthCalendar.test.ts: ok");
}

main();
