import assert from 'node:assert/strict';

import {
  confirmToken,
  dangerTitle,
  destroyedLines,
  disconnectedLines,
  litterDangerMode,
  namesMatch,
  preservedLines,
  type LitterDeleteImpact,
} from './deleteImpact';

/** Run: npx tsx lib/litters/deleteImpact.test.ts */

function impact(patch: Partial<LitterDeleteImpact> = {}): LitterDeleteImpact {
  return {
    litterId: 'x',
    litterName: 'Claire × Santini – Jul 2026',
    puppies: 0,
    healthRecords: 0,
    photos: 0,
    financialEntries: 0,
    taskItems: 0,
    invoices: 0,
    expenses: 0,
    contracts: 0,
    reservations: 0,
    applications: 0,
    waitingList: 0,
    heatCycles: 0,
    quoteItems: 0,
    clientGroups: 0,
    pairings: 0,
    breedingPlanSteps: 0,
    calendarEvents: 0,
    ...patch,
  };
}

function main() {
  const claire = impact({
    puppies: 10,
    healthRecords: 24,
    photos: 18,
    financialEntries: 6,
    invoices: 3,
    contracts: 1,
    waitingList: 2,
  });
  assert.equal(litterDangerMode(claire), 'archive');
  assert.equal(dangerTitle('archive', claire.litterName), 'Archive “Claire × Santini – Jul 2026”?');
  assert.deepEqual(destroyedLines(claire), [
    '24 health records',
    '18 photos',
    '6 financial entries',
  ]);
  assert.equal(
    disconnectedLines(claire)[0],
    '10 puppies — they will remain as dogs but lose their litter and their littermates',
  );
  assert.equal(
    disconnectedLines(claire)[1],
    '3 invoices, 1 contract, 2 waiting list entries',
  );
  assert.equal(preservedLines(claire)[0], '10 puppies');
  assert.ok(!preservedLines(claire)[0].includes('lose'));

  const empty = impact({ litterName: 'Draft pairing' });
  assert.equal(litterDangerMode(empty), 'delete');
  assert.deepEqual(destroyedLines(empty), []);
  assert.deepEqual(disconnectedLines(empty), []);
  assert.equal(namesMatch(empty.litterName, 'Draft pairing'), true);
  assert.equal(namesMatch(claire.litterName, 'claire x santini - jul 2026'), true);
  assert.equal(confirmToken(null), 'DELETE');
  assert.equal(namesMatch(null, 'delete'), true);

  console.log('deleteImpact.test.ts ok');
}

main();
