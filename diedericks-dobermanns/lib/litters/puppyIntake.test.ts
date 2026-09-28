import assert from 'node:assert/strict';

import {
  formatPuppySaved,
  intakeIsComplete,
  savablePuppyIndexes,
  validatePuppyIntake,
} from './puppyIntake';
import {
  belowBirthWeightAfter48h,
  hasNotGained,
  intervalReadings,
  weightSaveMessage,
  weightsLeadTheLitter,
} from './weightRounds';
import { compareLongestWait, daysWaiting, isLongWait } from '../waitlist/litterQueue';

/** Run: npx tsx lib/litters/puppyIntake.test.ts */

const complete = {
  sex: 'male',
  collarColour: 'green',
  tailType: 'docked',
  birthWeightGrams: 420,
  birthTime: '02:14',
  usedCollars: ['red'],
};

function main() {
  const missingCollar = validatePuppyIntake({ ...complete, collarColour: null });
  assert.equal(intakeIsComplete(missingCollar), false);
  assert.ok(missingCollar.collar);
  assert.equal(missingCollar.sex, undefined);

  const saved = validatePuppyIntake(complete);
  assert.equal(intakeIsComplete(saved), true);

  const missingTail = validatePuppyIntake({ ...complete, tailType: null });
  assert.equal(intakeIsComplete(missingTail), false);
  assert.match(missingTail.tail ?? '', /Tail is required/);

  const colourOptional = validatePuppyIntake(complete);
  assert.equal(intakeIsComplete(colourOptional), true);

  const indexes = savablePuppyIndexes([
    complete,
    complete,
    { ...complete, collarColour: 'blue', sex: 'female' },
    { ...complete, collarColour: null, birthWeightGrams: null },
  ]);
  assert.deepEqual(indexes, [0, 1, 2]);

  const dup = validatePuppyIntake({ ...complete, collarColour: 'red' });
  assert.ok(dup.duplicate);
  const overridden = validatePuppyIntake({
    ...complete,
    collarColour: 'red',
    allowDuplicateCollar: true,
  });
  assert.equal(intakeIsComplete(overridden), true);

  assert.equal(
    formatPuppySaved({
      order: 4,
      total: 8,
      collarLabel: 'Green',
      sex: 'male',
      grams: 420,
      time: '02:14',
    }),
    'Puppy 4 of 8 saved — green collar, male, 420 g, 02:14',
  );

  const start = new Date(2026, 8, 28, 0, 10, 0);
  const twelve = intervalReadings({
    dogId: 'pup-1',
    start,
    count: 12,
    everyHours: 2,
    weightKg: 0.45,
  });
  assert.equal(twelve.length, 12);
  assert.equal(new Set(twelve.map((r) => r.recorded_at)).size, 12);
  assert.ok(twelve.every((r) => r.session === 'daily'));
  assert.ok(twelve.every((r) => r.dog_id === 'pup-1'));
  assert.equal(new Set(twelve.map((r) => r.recorded_date)).size, 1);

  assert.equal(weightSaveMessage(new Error('duplicate key value')), 'duplicate key value');

  const day10 = new Date('2026-09-28T12:00:00');
  assert.equal(weightsLeadTheLitter('2026-09-18', day10), true);
  assert.equal(weightsLeadTheLitter('2026-09-06', day10), false);
  assert.equal(weightsLeadTheLitter(null, day10), false);

  assert.equal(
    hasNotGained([
      { weight_kg: 0.45, recorded_date: '2026-09-27', recorded_at: '2026-09-27T06:00:00Z' },
      { weight_kg: 0.45, recorded_date: '2026-09-28', recorded_at: '2026-09-28T06:00:00Z' },
    ]),
    true,
  );
  assert.equal(
    hasNotGained([
      { weight_kg: 0.45, recorded_date: '2026-09-27', recorded_at: '2026-09-27T06:00:00Z' },
      { weight_kg: 0.48, recorded_date: '2026-09-28', recorded_at: '2026-09-28T06:00:00Z' },
    ]),
    false,
  );

  assert.equal(
    belowBirthWeightAfter48h({
      birthWeightGrams: 450,
      actualDate: '2026-09-25',
      latestKg: 0.44,
      now: new Date('2026-09-28T12:00:00'),
    }),
    true,
  );

  const queue = [
    { queue_anchor_at: null, date_added: '2026-09-01' },
    { queue_anchor_at: '2026-06-04', date_added: '2026-09-20' },
    { queue_anchor_at: null, date_added: '2026-06-05' },
  ];
  const ordered = [...queue].sort(compareLongestWait);
  assert.equal(ordered[0].queue_anchor_at, '2026-06-04');
  assert.equal(daysWaiting(ordered[0], new Date('2026-09-28T12:00:00')), 116);
  assert.equal(isLongWait(116), true);
  assert.equal(isLongWait(90), false);
  assert.equal(daysWaiting({ queue_anchor_at: null, date_added: '2026-09-01' }, new Date('2026-09-28T12:00:00')), 27);

  console.log('puppyIntake.test.ts ok');
}

main();
