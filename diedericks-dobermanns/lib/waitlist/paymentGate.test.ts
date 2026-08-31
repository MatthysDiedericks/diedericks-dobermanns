import assert from 'node:assert/strict';

import {
  WAITLIST_PAYMENT_REQUIRED,
  awaitingPaymentLabel,
  daysSince,
  isWaitlistPaymentGateError,
} from './paymentGate';

/** Run: npx tsx lib/waitlist/paymentGate.test.ts */

assert.equal(isWaitlistPaymentGateError(null), false);
assert.equal(isWaitlistPaymentGateError('nope'), false);
assert.equal(
  isWaitlistPaymentGateError(`${WAITLIST_PAYMENT_REQUIRED}: A recorded payment is required`),
  true,
);

const now = new Date('2026-08-31T12:00:00+02:00');
assert.equal(daysSince('2026-08-31T08:00:00+02:00', now), 0);
assert.equal(daysSince('2026-08-30T08:00:00+02:00', now), 1);
assert.equal(daysSince('2026-08-24T08:00:00+02:00', now), 7);
assert.equal(daysSince(null, now), null);

assert.equal(awaitingPaymentLabel('2026-08-31T08:00:00+02:00', now), 'Approved — awaiting payment · today');
assert.equal(awaitingPaymentLabel('2026-08-30T08:00:00+02:00', now), 'Approved — awaiting payment · 1 day');
assert.equal(awaitingPaymentLabel('2026-08-24T08:00:00+02:00', now), 'Approved — awaiting payment · 7 days');

console.log('paymentGate.test.ts ok');
