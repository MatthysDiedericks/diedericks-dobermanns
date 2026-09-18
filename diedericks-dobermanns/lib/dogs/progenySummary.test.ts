import assert from 'node:assert/strict';

import { formatProgenySummaryLine, summariseProgeny } from './progenySummary';

/** Run: npx tsx lib/dogs/progenySummary.test.ts */

function pup(
  id: string,
  sex: 'male' | 'female' | null,
  dob: string | null,
  litterId: string | null,
) {
  return { id, sex, date_of_birth: dob, litter_id: litterId };
}

function main() {
  assert.equal(formatProgenySummaryLine(summariseProgeny([])), null);

  const hunterKing = [
    ...Array.from({ length: 45 }, (_, i) =>
      pup(
        `m${i}`,
        'male',
        i < 12 ? '2021-05-10' : '2024-01-01',
        i < 12 ? null : `litter-${i % 11}`,
      ),
    ),
    ...Array.from({ length: 47 }, (_, i) =>
      pup(
        `f${i}`,
        'female',
        i === 0 ? '2026-06-02' : '2023-03-01',
        i < 12 ? (i < 1 ? null : `litter-${i % 11}`) : `litter-${i % 11}`,
      ),
    ),
  ];
  const summary = summariseProgeny(hunterKing);
  assert.equal(summary.total, 92);
  assert.equal(summary.litterCount, 11);
  assert.equal(summary.males, 45);
  assert.equal(summary.females, 47);
  assert.equal(summary.firstDate, '2021-05-10');
  assert.equal(summary.latestDate, '2026-06-02');
  assert.equal(
    formatProgenySummaryLine(summary),
    '92 puppies · 11 litters · 45 males, 47 females · first May 2021, latest Jun 2026',
  );

  console.log('progenySummary.test.ts: ok');
}

main();
