import assert from "node:assert/strict";

import {
  BIRTH_ROUND_KEY,
  roundKey,
  roundLabel,
  saveWeightRound,
  weightLogInsert,
  weightRoundSummary,
  type WeightInsert,
  type WeightLogWriter,
} from "./weightRounds";

/**
 * The Odessa litter, 29 Sep 2026. Yesterday's round was typed up at 07:51 and
 * today's at 07:52, so recorded_at said "29 Sep" for both and the grid showed
 * two columns labelled 29 Sept — one of which was actually the 28th.
 */
function columnsAreDaysNotTypingTimes() {
  const yesterdayTypedToday = {
    recorded_date: "2026-09-28",
    recorded_at: "2026-09-29T07:51:21.152Z",
    session: "AM",
  };
  const today = {
    recorded_date: "2026-09-29",
    recorded_at: "2026-09-29T07:52:26.117Z",
    session: "AM",
  };
  assert.equal(roundKey(yesterdayTypedToday), "2026-09-28#AM");
  assert.equal(roundKey(today), "2026-09-29#AM");
  assert.notEqual(roundKey(yesterdayTypedToday), roundKey(today));
  assert.equal(roundLabel(roundKey(yesterdayTypedToday)), "28 Sep AM");
  assert.equal(roundLabel(roundKey(today)), "29 Sep AM");

  // Six puppies typed over a minute boundary are ONE round, not two columns.
  const perPuppy = [
    "2026-09-29T07:51:58.000Z",
    "2026-09-29T07:52:03.000Z",
    "2026-09-29T07:52:11.000Z",
  ].map((at) => roundKey({ recorded_date: "2026-09-28", recorded_at: at, session: "PM" }));
  assert.equal(new Set(perPuppy).size, 1, "one round must be one column");

  assert.equal(roundLabel(BIRTH_ROUND_KEY), "Birth");
  assert.equal(
    roundLabel(roundKey({ recorded_date: "2026-09-28", recorded_at: null, session: "daily" })),
    "28 Sep",
    "a daily round shows the day with no time",
  );

  console.log("columns: keyed on the day weighed, not the minute typed");
}

/** Run: npx tsx src/lib/litters/weightRounds.test.ts */

function memoryWriter(seed: WeightInsert[] = []): WeightLogWriter & { rows: WeightInsert[] } {
  const rows = seed.map((row) => ({ ...row }));
  return {
    rows,
    async findExisting(dogId, recordedDate, session) {
      const found = rows.find(
        (row) =>
          row.dog_id === dogId &&
          row.recorded_date === recordedDate &&
          row.session === session,
      );
      return found ? { weight_kg: found.weight_kg } : null;
    },
    async upsert(row) {
      const index = rows.findIndex(
        (existing) =>
          existing.dog_id === row.dog_id &&
          existing.recorded_date === row.recorded_date &&
          existing.session === row.session,
      );
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return { error: null };
    },
  };
}

async function main() {
  const date = "2026-09-28";
  const entries = [1, 2, 3, 4, 5, 6].map((n) => ({
    dogId: `dog-${n}`,
    name: `K${n}`,
    weightKg: 0.5 + n / 1000,
    recordedAt: new Date(Date.UTC(2026, 8, 28, 16, 54, n)).toISOString(),
  }));

  const writer = memoryWriter(
    [1, 2, 3, 4, 5, 6].map((n) =>
      weightLogInsert({
        dogId: `dog-${n}`,
        weightKg: 0.4,
        recordedAt: new Date(Date.UTC(2026, 8, 28, 6, 0, n)),
        recordedDate: date,
        session: "AM",
      }),
    ),
  );

  const first = await saveWeightRound(writer, {
    recordedDate: date,
    session: "PM",
    entries,
  });
  assert.equal(weightRoundSummary(first), "Saved 6 of 6.");
  const pm = writer.rows.filter((row) => row.session === "PM");
  assert.equal(pm.length, 6);
  const times = new Set(pm.map((row) => row.recorded_at));
  assert.equal(times.size, 6);
  assert.equal(pm.every((row) => row.session === "PM"), true);

  const again = await saveWeightRound(writer, {
    recordedDate: date,
    session: "PM",
    entries: [
      {
        dogId: "dog-3",
        name: "K3",
        weightKg: 0.541,
        recordedAt: new Date(Date.UTC(2026, 8, 28, 17, 10, 0)).toISOString(),
      },
    ],
  });
  assert.equal(
    weightRoundSummary(again),
    "Saved 1 of 1.\nK3 PM updated from 0.503 to 0.541 kg.",
  );
  assert.equal(writer.rows.filter((row) => row.session === "PM").length, 6);

  const failing = memoryWriter();
  const original = failing.upsert.bind(failing);
  failing.upsert = async (row) => {
    if (row.dog_id === "dog-3" || row.dog_id === "dog-5") {
      return { error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    }
    return original(row);
  };
  const partial = await saveWeightRound(failing, {
    recordedDate: date,
    session: "PM",
    entries,
  });
  assert.equal(
    weightRoundSummary(partial),
    "Saved 4 of 6. K3 and K5 failed: duplicate entry for PM on 28 Sep.",
  );
  assert.equal(partial.failures.find((f) => f.name === "K3")?.reason, "duplicate entry for PM on 28 Sep");

  console.log("weight round: 6 saved, re-weigh updated, partial failure named");

  columnsAreDaysNotTypingTimes();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
