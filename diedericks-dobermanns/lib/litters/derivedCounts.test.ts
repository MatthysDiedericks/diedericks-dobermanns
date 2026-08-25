import assert from 'node:assert/strict';

import {
  buildDerivedCountsByLitter,
  deriveLitterCount,
  formatLitterCount,
  litterHasRecordedPuppies,
  puppyCountsAsAvailable,
  type PuppyCountSlice,
} from './derivedCounts';

/** Run: npx tsx lib/litters/derivedCounts.test.ts */

const stored = { available_count: 9, puppy_count: 10 };

function slice(
  patch: Partial<PuppyCountSlice> & { status: string | null },
): PuppyCountSlice {
  return {
    litter_id: 'claire',
    owner_id: null,
    reserved_for_name: null,
    new_owner_name: null,
    ...patch,
  };
}

function main() {
  assert.equal(puppyCountsAsAvailable({ status: 'available' }), true);
  assert.equal(puppyCountsAsAvailable({ status: 'sold' }), false);
  assert.equal(puppyCountsAsAvailable({ status: 'deceased' }), false);
  assert.equal(
    puppyCountsAsAvailable({ status: 'available', reserved_for_name: 'Ann' }),
    false,
  );

  const none = deriveLitterCount([], stored);
  assert.equal(none.fromPuppies, false);
  assert.equal(none.mismatch, false);
  assert.equal(formatLitterCount(none), '9 / 10');
  assert.equal(litterHasRecordedPuppies(none), true);

  const emptyStored = deriveLitterCount([], {
    available_count: null,
    puppy_count: null,
  });
  assert.equal(formatLitterCount(emptyStored), '—');
  assert.equal(litterHasRecordedPuppies(emptyStored), false);

  const living = [
    slice({ status: 'available' }),
    slice({ status: 'available' }),
    slice({ status: 'available' }),
    slice({ status: 'available' }),
    slice({ status: 'available' }),
    slice({ status: 'sold' }),
    slice({ status: 'sold' }),
    slice({ status: 'sold' }),
    slice({ status: 'sold' }),
    slice({ status: 'deceased' }),
  ];
  const derived = deriveLitterCount(living, stored);
  assert.equal(derived.available, 5);
  assert.equal(derived.total, 10);
  assert.equal(derived.mismatch, true);

  const byLitter = buildDerivedCountsByLitter(
    [slice({ litter_id: 'a', status: 'available' }), slice({ litter_id: 'a', status: 'sold' })],
    [{ id: 'a', available_count: 2, puppy_count: 2 }],
  );
  assert.equal(byLitter.a.mismatch, true);
  assert.equal(byLitter.a.available, 1);

  console.log('derivedCounts.test.ts ok');
}

main();
