import assert from 'node:assert/strict';

import { suggestNextDueDate } from './nextDue';

/** Run: npx tsx lib/health/nextDue.test.ts */

function main() {
  assert.equal(suggestNextDueDate('2026-09-13', 'quarterly'), '2026-12-13');
  assert.equal(suggestNextDueDate('2026-09-13', 'monthly'), '2026-10-13');
  assert.equal(suggestNextDueDate('2026-09-13', 'biannual'), '2027-03-13');
  assert.equal(suggestNextDueDate('2026-09-13', 'annual'), '2027-09-13');
  assert.equal(suggestNextDueDate('2026-09-13', 'custom'), '');
  assert.equal(suggestNextDueDate('', 'quarterly'), '');
  console.log('nextDue.test.ts: ok');
}

main();
