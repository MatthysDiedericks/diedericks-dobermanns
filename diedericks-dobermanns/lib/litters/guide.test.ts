import assert from 'node:assert/strict';

import {
  bornAgoLabel,
  defaultWeighInSession,
  formatWhelpingProgress,
  isWeightConcern,
  latestPriorWeightKg,
  litterGuidePhase,
  litterNextAction,
  littersWeighedToday,
  parseGrams,
  plannedGaps,
  weighDeltaGrams,
} from './guide';

/** Run: npx tsx lib/litters/guide.test.ts */

function main() {
  assert.equal(
    litterGuidePhase({ status: 'planned', puppyCount: 0 }),
    'planned',
  );
  assert.equal(
    litterGuidePhase({ status: 'expected', puppyCount: 0 }),
    'planned',
  );
  assert.equal(litterGuidePhase({ status: 'born', puppyCount: 0 }), 'whelping');
  assert.equal(litterGuidePhase({ status: 'born', puppyCount: 8 }), 'rearing');
  assert.equal(litterGuidePhase({ status: 'placed', puppyCount: 8 }), 'placed');

  assert.deepEqual(plannedGaps({ expectedDate: null, litterLetter: null }), [
    'expected_date',
    'litter_letter',
  ]);
  assert.deepEqual(
    plannedGaps({ expectedDate: '2026-09-20', litterLetter: 'A' }),
    [],
  );

  assert.equal(
    formatWhelpingProgress([
      { outcome: 'live', birth_time: '01:12' },
      { outcome: 'live', birth_time: '01:40' },
      { outcome: 'stillborn', birth_time: '01:58' },
    ]),
    '3 born · 2 live, 1 stillborn · last at 01:58',
  );

  const noon = new Date('2026-09-17T08:00:00');
  assert.equal(defaultWeighInSession(noon, new Set()), 'AM');
  assert.equal(defaultWeighInSession(noon, new Set(['AM'])), 'PM');
  const evening = new Date('2026-09-17T15:00:00');
  assert.equal(defaultWeighInSession(evening, new Set()), 'PM');
  assert.equal(defaultWeighInSession(evening, new Set(['PM'])), 'AM');

  const logs = [
    { recorded_date: '2026-09-16', weight_kg: 0.45, session: 'AM' },
    { recorded_date: '2026-09-17', weight_kg: 0.512, session: 'AM' },
  ];
  assert.equal(latestPriorWeightKg(logs, '2026-09-17', 'PM'), 0.512);
  assert.equal(latestPriorWeightKg(logs, '2026-09-17', 'AM'), 0.45);
  assert.equal(weighDeltaGrams(0.45, 0.512), 62);
  assert.equal(weighDeltaGrams(0.41, 0.402), -8);
  assert.equal(isWeightConcern(-8), true);
  assert.equal(isWeightConcern(0), true);
  assert.equal(isWeightConcern(62), false);

  assert.equal(
    litterNextAction({
      status: 'born',
      puppyCount: 8,
      actualDate: '2026-09-14',
      weighedToday: false,
      now: new Date('2026-09-17T10:00:00'),
    }),
    'Born 3 days ago · 8 pups · not weighed today',
  );

  const ref = new Date('2026-09-17T10:00:00');
  assert.equal(bornAgoLabel('2026-09-14', ref), 'Born 3 days ago');
  assert.equal(bornAgoLabel('2026-09-17', ref), 'Born today');

  assert.deepEqual(
    littersWeighedToday(
      [
        { id: 'p1', litter_id: 'L1' },
        { id: 'p2', litter_id: 'L2' },
      ],
      [
        { dog_id: 'p1', notes: 'Birth weight' },
        { dog_id: 'p2', notes: null },
      ],
    ),
    ['L2'],
  );

  assert.equal(parseGrams('450'), 450);
  assert.equal(parseGrams(''), null);

  console.log('guide.test.ts ok');
}

main();
