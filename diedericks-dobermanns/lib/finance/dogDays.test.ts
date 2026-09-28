import assert from "node:assert/strict";

import {
  allocateSharedAmount,
  computeDogDays,
  hasUnresolvedDeparture,
  inclusiveDays,
  lifecycleDepartureDay,
  unresolvedDepartureDogs,
  wasOnPropertyOn,
  type DogDaysDog,
  type DogLifecycle,
} from "./dogDays";

/** Run: npx tsx src/lib/finance/dogDays.test.ts */

const CLAIRE_LITTER = "11111111-1111-4111-8111-111111111001";
const CLAIRE = "claire-dam";
const BORN = "2026-07-10";
const GO_HOME = "2026-09-04";

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function life(patch: Partial<DogLifecycle> & { id?: string } = {}): DogLifecycle {
  return {
    id: patch.id ?? "dog",
    date_of_birth: "2024-01-01",
    ownership_status: "unknown",
    ownership_status_at: null,
    deceased_at: null,
    outcome: null,
    outcome_date: null,
    ...patch,
  };
}

function pup(n: number, patch: Partial<DogDaysDog> = {}): DogDaysDog {
  return {
    id: `j${n}`,
    date_of_birth: BORN,
    status: "available",
    deceased_at: null,
    litter_id: CLAIRE_LITTER,
    outcome: "live",
    category: "puppy",
    ...patch,
  };
}

function claireLitterFixture() {
  const pups = Array.from({ length: 10 }, (_, i) => pup(i + 1));
  const claire: DogDaysDog = {
    id: CLAIRE,
    date_of_birth: "2023-01-15",
    status: "keep",
    deceased_at: null,
    litter_id: null,
    category: "breeding_stock",
  };
  const litter = {
    id: CLAIRE_LITTER,
    actual_date: BORN,
    go_home_date: GO_HOME,
    mother_id: CLAIRE,
  };
  return { dogs: [claire, ...pups], litters: [litter] };
}

function main() {
  assert.equal(inclusiveDays("2026-07-10", "2026-07-10"), 1);
  assert.equal(inclusiveDays("2026-07-10", "2026-07-11"), 2);
  // Jul 10–31 = 22, Aug = 31, Sep 1–4 = 4 → 57
  assert.equal(inclusiveDays(BORN, GO_HOME), 57);

  const fixture = claireLitterFixture();
  const stay = computeDogDays({
    from: BORN,
    to: GO_HOME,
    ...fixture,
  });

  const litterDays = stay.byLitter[CLAIRE_LITTER];
  // 10 pups × 57 days × 0.5 = 285
  assert.equal(litterDays.puppyWeightedDays, 285);
  // Dam extra 57 × (2.0 − 1.0) = 57
  assert.equal(litterDays.nursingExtraDays, 57);
  assert.equal(litterDays.weightedDays, 342);
  assert.equal(litterDays.puppyCount, 10);
  // Claire's own days stay at 1.0; extra is on the litter only
  assert.equal(stay.byDog[CLAIRE].weightedDays, 57);
  // Kennel total = puppies 285 + Claire 57 + nursing extra 57 = 399
  assert.equal(stay.totalWeightedDays, 399);

  const stillborn = computeDogDays({
    from: BORN,
    to: GO_HOME,
    dogs: [
      fixture.dogs[0],
      ...Array.from({ length: 8 }, (_, i) => pup(i + 1)),
      pup(9, { outcome: "stillborn" }),
      pup(10, { outcome: "died_early", deceased_at: "2026-07-12" }),
    ],
    litters: fixture.litters,
  });
  const sb = stillborn.byLitter[CLAIRE_LITTER];
  // 8 live × 57 × 0.5 = 228; died_early Jul 10–12 = 3 × 0.5 = 1.5; stillborn 0
  assert.equal(sb.puppyWeightedDays, 229.5);
  assert.equal(stillborn.byDog.j9.weightedDays, 0);
  assert.equal(stillborn.byDog.j10.rawDays, 3);

  const july = computeDogDays({
    from: "2026-07-01",
    to: "2026-07-31",
    ...fixture,
  });
  const julyLitter = july.byLitter[CLAIRE_LITTER];
  // Jul 10–31 = 22 days. 10 × 22 × 0.5 = 110; nursing extra 22; litter 132
  assert.equal(julyLitter.puppyWeightedDays, 110);
  assert.equal(julyLitter.nursingExtraDays, 22);
  assert.equal(julyLitter.weightedDays, 132);
  // Claire all of July (31) + 4 other adults would change the share; here only her
  assert.equal(july.byDog[CLAIRE].weightedDays, 31);
  assert.equal(july.totalWeightedDays, 163);

  const feed = allocateSharedAmount({
    amount: 14000,
    shareWeightedDays: julyLitter.weightedDays,
    totalWeightedDays: july.totalWeightedDays,
    category: "Feed & Nutrition",
    from: "2026-07-01",
    to: "2026-07-31",
  });
  // 132 / 163 × R14,000 = R11,337.42…
  assert.ok(Math.abs(feed.share - (132 / 163) * 14000) < 0.01);
  assert.match(feed.working, /Feed & Nutrition/);
  assert.match(feed.working, /132/);
  assert.match(feed.working, /163/);

  // Sold 1 Mar: on the property 28 Feb and 1 Mar, gone 2 Mar.
  const sold = life({
    ownership_status: "with_owner",
    ownership_status_at: "2026-03-01",
  });
  assert.equal(wasOnPropertyOn(sold, day("2026-02-28")), true);
  assert.equal(wasOnPropertyOn(sold, day("2026-03-01")), true);
  assert.equal(wasOnPropertyOn(sold, day("2026-03-02")), false);

  // Deceased by status, deceased_at still null — status date is the leave date.
  const deadByStatus = life({
    ownership_status: "deceased",
    ownership_status_at: "2026-08-12",
    deceased_at: null,
  });
  assert.equal(deadByStatus.deceased_at, null);
  assert.equal(wasOnPropertyOn(deadByStatus, day("2026-08-11")), true);
  assert.equal(wasOnPropertyOn(deadByStatus, day("2026-08-12")), true);
  assert.equal(wasOnPropertyOn(deadByStatus, day("2026-08-13")), false);

  // Earliest of the three, not first-non-null. Sold March, marked deceased August.
  const soldThenDied = life({
    ownership_status: "deceased",
    ownership_status_at: "2026-08-01",
    deceased_at: "2026-08-01",
    outcome_date: "2026-03-01",
  });
  assert.equal(lifecycleDepartureDay(soldThenDied), "2026-03-01");
  assert.equal(wasOnPropertyOn(soldThenDied, day("2026-02-28")), true);
  assert.equal(wasOnPropertyOn(soldThenDied, day("2026-03-01")), true);
  assert.equal(wasOnPropertyOn(soldThenDied, day("2026-03-02")), false);
  assert.equal(wasOnPropertyOn(soldThenDied, day("2026-08-01")), false);

  const firstNonNullWouldBeAugust = life({
    ownership_status: "deceased",
    ownership_status_at: "2026-08-15",
    deceased_at: "2026-08-20",
    outcome_date: "2026-03-01",
  });
  assert.equal(lifecycleDepartureDay(firstNonNullWouldBeAugust), "2026-03-01");

  // Non-kennel status, no dates: excluded and reported, never silently kept.
  const undatedSold = life({
    id: "undated-sold",
    ownership_status: "with_owner",
    ownership_status_at: null,
    deceased_at: null,
    outcome_date: null,
  });
  assert.equal(hasUnresolvedDeparture(undatedSold), true);
  assert.equal(wasOnPropertyOn(undatedSold, day("2026-09-14")), false);
  assert.deepEqual(unresolvedDepartureDogs([sold, deadByStatus, undatedSold]).map((d) => d.id), [
    "undated-sold",
  ]);

  // Kennel-default unknown with no date stays on the property.
  const kennelDefault = life({ ownership_status: "unknown" });
  assert.equal(hasUnresolvedDeparture(kennelDefault), false);
  assert.equal(wasOnPropertyOn(kennelDefault, day("2026-09-14")), true);

  console.log("dogDays.test.ts ok");
  console.log(
    `Claire × Santini ${BORN} → ${GO_HOME}: ${litterDays.weightedDays} weighted dog-days`,
  );
  console.log(`  puppies ${litterDays.puppyWeightedDays} + nursing extra ${litterDays.nursingExtraDays}`);
  console.log(`July 2026 (this litter + Claire only): ${julyLitter.working}`);
  console.log(`  sample feed share: ${feed.working}`);
}

main();
