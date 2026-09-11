import assert from 'node:assert/strict';

import {
  parsePhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER_MESSAGE,
  PHONE_REQUIRED_MESSAGE,
} from './phone';

/** Run: npx tsx lib/phone.test.ts */

function main() {
  const empty = parsePhone('');
  assert.equal(empty.ok, false);
  assert.equal(parsePhone(null).ok, false);
  assert.equal(parsePhone('   ').ok, false);
  if (!empty.ok) {
    assert.equal(empty.error, PHONE_REQUIRED_MESSAGE);
  }

  const short = parsePhone('123');
  assert.equal(short.ok, false);
  if (!short.ok) assert.equal(short.error, PHONE_INVALID_MESSAGE);

  const zeros = parsePhone('0000000000');
  assert.equal(zeros.ok, false);
  if (!zeros.ok) assert.equal(zeros.error, PHONE_PLACEHOLDER_MESSAGE);

  const seq = parsePhone('1234567890');
  assert.equal(seq.ok, false);
  if (!seq.ok) assert.equal(seq.error, PHONE_PLACEHOLDER_MESSAGE);

  const repeated = parsePhone('111111111');
  assert.equal(repeated.ok, false);

  const eswatini = parsePhone('+26876123456');
  assert.equal(eswatini.ok, true);
  if (eswatini.ok) assert.equal(eswatini.value, '+26876123456');

  const saPlus = parsePhone('+27821234567');
  assert.equal(saPlus.ok, true);
  if (saPlus.ok) assert.equal(saPlus.value, '+27821234567');

  const saLocal = parsePhone('082 123 4567');
  assert.equal(saLocal.ok, true);
  if (saLocal.ok) assert.equal(saLocal.value, '0821234567');

  const uk = parsePhone('+44 7911 123456');
  assert.equal(uk.ok, true);
  if (uk.ok) assert.equal(uk.value, '+447911123456');

  console.log('phone.test.ts ok');
}

main();
