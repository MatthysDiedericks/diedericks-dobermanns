import assert from 'node:assert/strict';

import {
  daysOnClock,
  holdChipLabel,
  isLapsingSoon,
  isQuoteOnHold,
  reminderProgressLabel,
} from './quoteLapse';

/** Run: npx tsx lib/finance/quoteLapse.test.ts */

const sent = '2026-06-01T08:00:00.000Z';

assert.equal(daysOnClock(sent, null, new Date('2026-07-01T08:00:00.000Z')), 30);
assert.equal(daysOnClock(sent, '2026-06-20T08:00:00.000Z', new Date('2026-07-01T08:00:00.000Z')), 11);
assert.equal(isQuoteOnHold('2026-11-18', new Date('2026-09-01')), true);
assert.equal(isQuoteOnHold('2026-08-01', new Date('2026-09-01')), false);
assert.equal(holdChipLabel('2026-11-18'), 'On hold until 18 Nov');

assert.equal(
  isLapsingSoon({ status: 'sent', sent_at: sent }, 60, new Date('2026-08-01T08:00:00.000Z')),
  true,
);
assert.equal(
  isLapsingSoon({ status: 'sent', sent_at: sent }, 60, new Date('2026-06-15T08:00:00.000Z')),
  false,
);

assert.equal(
  reminderProgressLabel({
    status: 'sent',
    sent_at: sent,
    reminder_first_sent_at: '2026-07-01T08:00:00.000Z',
  })?.includes('first reminder sent'),
  true,
);

console.log('quoteLapse.test.ts ok');
