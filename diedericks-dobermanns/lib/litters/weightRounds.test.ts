import assert from "node:assert/strict";

import {
  saveWeightRound,
  weightLogInsert,
  weightRoundSummary,
  type WeightInsert,
  type WeightLogWriter,
} from "./weightRounds";

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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
