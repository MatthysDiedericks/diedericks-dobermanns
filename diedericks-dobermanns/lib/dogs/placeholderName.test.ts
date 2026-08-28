import assert from 'node:assert/strict';

import { buildBirthdayCheckIn } from '../followUps/birthdayDraft';
import { buyerNameFields, isPlaceholderDogName, realDogName } from './placeholderName';

/** Run: npx tsx lib/dogs/placeholderName.test.ts */

function main() {
  assert.equal(isPlaceholderDogName('Puppy 7'), true);
  assert.equal(isPlaceholderDogName('pup 1'), true);
  assert.equal(isPlaceholderDogName('  Puppy10'), true);
  assert.equal(isPlaceholderDogName('Puppy 7 (Pink)'), true);
  assert.equal(isPlaceholderDogName(''), true);
  assert.equal(isPlaceholderDogName('   '), true);
  assert.equal(isPlaceholderDogName(null), true);
  assert.equal(isPlaceholderDogName('Ade'), false);
  assert.equal(isPlaceholderDogName('Nala'), false);
  assert.equal(isPlaceholderDogName('Puppy'), false);

  assert.equal(realDogName('Ade', 'Puppy 7'), 'Ade');
  assert.equal(realDogName('', 'Nala'), 'Nala');
  assert.equal(realDogName('Puppy 7', 'Puppy 7'), null);
  assert.equal(realDogName(null, 'Pup 3'), null);

  assert.deepEqual(buyerNameFields('Puppy 7', 'Ade'), { call_name: 'Ade', name: 'Ade' });
  assert.deepEqual(buyerNameFields('Nala', 'Nala'), { call_name: 'Nala' });

  const named = buildBirthdayCheckIn({
    ageTurning: 3,
    dueIsToday: true,
    dueLabel: '21 Aug',
    callName: 'Ade',
    kennelName: 'Puppy 7',
  });
  assert.match(named, /^Ade turns 3 today\./);
  assert.doesNotMatch(named, /Puppy 7/);
  assert.match(named, /task for you/i);

  const unnamed = buildBirthdayCheckIn({
    ageTurning: 3,
    dueIsToday: true,
    dueLabel: '21 Aug',
    kennelName: 'Puppy 7',
    sex: 'male',
    collarColour: 'pink',
    litterLabel: 'Litter J (Cyrus × Hunter-King)',
  });
  assert.match(unnamed, /Male, Pink collar, Litter J \(Cyrus × Hunter-King\) turns 3 today/);
  assert.match(unnamed, /No name recorded/);
  assert.doesNotMatch(unnamed, /Puppy 7/);

  console.log('placeholderName.test.ts: ok');
}

main();
