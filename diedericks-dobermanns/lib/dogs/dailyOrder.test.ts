import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

import { md5Hex, seedIndex, sortByDailySeed } from './dailyOrder';
import { pickProfilePhoto } from './profilePhoto';

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

assert.equal(seedIndex('x', 0), 0);
assert.equal(seedIndex('x', 1), 0);

function photo(id: string, uploadedAt: string, pinned = false) {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail_url: null as string | null,
    is_primary: pinned,
    uploaded_at: uploadedAt,
    type: 'photo' as const,
  };
}

const rotating = Array.from({ length: 10 }, (_, i) =>
  photo(`p${i}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
);

const dayA = pickProfilePhoto(rotating, today, 'rotating-dog');
const dayAAgain = pickProfilePhoto(rotating, today, 'rotating-dog');
const dayB = pickProfilePhoto(rotating, tomorrow, 'rotating-dog');
assert.equal(dayA?.id, dayAAgain?.id);
assert.notEqual(dayA?.id, dayB?.id);

const pinnedSet = [
  photo('old', '2024-01-01T00:00:00Z'),
  photo('pin', '2025-01-01T00:00:00Z', true),
  photo('new', '2026-08-01T00:00:00Z'),
];
assert.equal(pickProfilePhoto(pinnedSet, today, 'pinned-dog')?.id, 'pin');
assert.equal(pickProfilePhoto(pinnedSet, tomorrow, 'pinned-dog')?.id, 'pin');

const only = [photo('solo', '2026-01-01T00:00:00Z')];
assert.equal(pickProfilePhoto(only, today, 'solo-dog')?.id, 'solo');
assert.equal(pickProfilePhoto(only, tomorrow, 'solo-dog')?.id, 'solo');
assert.equal(pickProfilePhoto([], today, 'empty-dog'), null);

const seen = new Set<string>();
for (let i = 0; i < 14; i++) {
  const day = new Date(Date.UTC(2026, 7, 31 + i, 10));
  const picked = pickProfilePhoto(rotating, day, 'rotating-dog');
  if (picked?.id) seen.add(picked.id);
}
assert.ok(
  seen.size >= 5,
  `expected at least 5 distinct photos over 14 days, got ${seen.size}`,
);

console.log('today', a.join(', '));
console.log('tomorrow', c.join(', '));
console.log('photo today', dayA?.id, 'photo tomorrow', dayB?.id);
console.log('14-day distinct', seen.size);
console.log('dailyOrder.test.ts ok');
