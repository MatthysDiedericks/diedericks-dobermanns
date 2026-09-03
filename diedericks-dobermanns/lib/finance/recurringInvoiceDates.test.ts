import assert from 'node:assert/strict';

import { previewIssueCopy, nextIssueDates } from './recurringInvoiceDates';

/** Run: npx tsx lib/finance/recurringInvoiceDates.test.ts */

assert.deepEqual(nextIssueDates('2026-10-01', 'monthly', 3), [
  '2026-10-01',
  '2026-11-01',
  '2026-12-01',
]);
assert.equal(
  previewIssueCopy('2026-10-01', 'monthly', '2026-12-01', null),
  'Issues 1 Oct, 1 Nov, 1 Dec, then stops',
);
assert.equal(
  previewIssueCopy('2026-10-01', 'monthly', null, null).includes('then continues'),
  true,
);
assert.equal(previewIssueCopy('2026-10-01', 'monthly', null, 1), 'Issues 1 Oct, then stops');

console.log('recurringInvoiceDates.test.ts ok');
