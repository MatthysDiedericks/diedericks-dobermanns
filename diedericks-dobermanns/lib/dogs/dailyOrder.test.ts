import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

import { md5Hex, sortByDailySeed } from './dailyOrder';

/** Run: npx tsx lib/dogs/dailyOrder.test.ts */

function nodeMd5(s: string) {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

assert.equal(md5Hex(''), nodeMd5(''));
assert.equal(md5Hex('hello'), nodeMd5('hello'));
assert.equal(md5Hex('2026-08-31abc'), nodeMd5('2026-08-31abc'));

const dogs = [{ id: 'aaa' }, { id: 'bbb' }, { id: 'ccc' }, { id: 'ddd' }];
const today = new Date('2026-08-31T12:00:00+02:00');
const tomorrow = new Date('2026-09-01T12:00:00+02:00');
const a = sortByDailySeed(dogs, today).map((d) => d.id);
const b = sortByDailySeed(dogs, today).map((d) => d.id);
const c = sortByDailySeed(dogs, tomorrow).map((d) => d.id);
assert.deepEqual(a, b);
assert.notDeepEqual(a, c);

console.log('today', a.join(', '));
console.log('tomorrow', c.join(', '));
console.log('dailyOrder.test.ts ok');
