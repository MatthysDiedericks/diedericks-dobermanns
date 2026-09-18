import assert from 'node:assert/strict';

import {
  birthWeightLogInsert,
  newbornPuppyInsert,
  shouldWriteBirthWeight,
} from './newbornPuppy';

/** Run: npx tsx lib/litters/newbornPuppy.test.ts */

function main() {
  const shared = {
    name: 'C11',
    sex: 'male' as const,
    colour: 'black_tan',
    collar_colour: 'red',
    birth_order: 11,
    birth_weight_grams: 450,
    date_of_birth: '2026-07-01',
    litter_id: '11111111-1111-4111-8111-111111111001',
  };

  const addPuppy = newbornPuppyInsert({ ...shared, birth_time: '06:12' });
  const registerPups = newbornPuppyInsert(shared);

  assert.equal(addPuppy.status, 'available');
  assert.equal(addPuppy.outcome, 'live');
  assert.equal(registerPups.status, 'available');
  assert.equal(registerPups.outcome, 'live');

  const dead = newbornPuppyInsert({
    ...shared,
    name: 'C12',
    outcome: 'stillborn',
  });
  assert.equal(dead.status, 'deceased');
  assert.equal(dead.outcome, 'stillborn');
  assert.equal(dead.deceased_at, shared.date_of_birth);
  assert.equal(addPuppy.category, 'puppy');
  assert.equal(registerPups.category, 'puppy');
  assert.deepEqual(Object.keys(addPuppy).sort(), Object.keys(registerPups).sort());
  for (const key of Object.keys(registerPups) as (keyof typeof registerPups)[]) {
    if (key === 'birth_time') continue;
    assert.equal(addPuppy[key], registerPups[key], key);
  }

  assert.equal(shouldWriteBirthWeight(450), true);
  assert.equal(shouldWriteBirthWeight(null), false);
  const log = birthWeightLogInsert('dog-1', 450, '2026-07-01');
  assert.equal(log.weight_kg, 0.45);
  assert.equal(log.session, 'AM');
  assert.equal(log.notes, 'Birth weight');
  assert.equal(log.recorded_date, '2026-07-01');

  console.log('newbornPuppy.test.ts ok');
  console.log('shared dog columns:', Object.keys(addPuppy).sort().join(', '));
  console.log('weight_logs columns:', Object.keys(log).sort().join(', '));
}

main();
