import assert from 'node:assert/strict';

import {
  financeLedgerDateSpan,
  financeYearRange,
  yearsFromRecordBounds,
} from './years';

/** Run: npx tsx lib/finance/years.test.ts */

const range = financeYearRange();
assert.equal(range[0], 2022);
assert.equal(range[range.length - 1], new Date().getFullYear() + 2);

assert.deepEqual(yearsFromRecordBounds([], 2026), [2026]);
assert.deepEqual(
  yearsFromRecordBounds(['2021-03-01', '2026-08-12', '2023-01-01'], 2026),
  [2026, 2025, 2024, 2023, 2022, 2021],
);
assert.deepEqual(
  yearsFromRecordBounds(['2021-01-01'], 2026),
  [2026, 2025, 2024, 2023, 2022, 2021],
);
assert.ok(!yearsFromRecordBounds(['2021-01-01', '2026-12-31'], 2026).includes(2027));
assert.ok(!yearsFromRecordBounds(['2021-01-01', '2026-12-31'], 2026).includes(2028));

assert.deepEqual(financeLedgerDateSpan([2026, 2025, 2021]), {
  from: '2021-01-01',
  to: '2026-12-31',
});

console.log('years.test.ts ok');
