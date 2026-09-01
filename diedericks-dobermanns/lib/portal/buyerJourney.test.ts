import assert from 'node:assert/strict';

import {
  BUYER_JOURNEY_STEPS,
  buyerJourneyStepLabel,
  deriveBuyerJourneyStep,
  isEarnedWaitingListPlace,
  isWaitlistStepSkipped,
  type BuyerJourneyInput,
} from './buyerJourney';

/** Run: npx tsx lib/portal/buyerJourney.test.ts */

const blank: BuyerJourneyInput = {
  hasApplication: false,
  applicationStatus: null,
  applicationApproved: false,
  portalAccessed: false,
  hasQuoteSent: false,
  hasQuoteAccepted: false,
  hasProofUploaded: false,
  paymentConfirmed: false,
  onWaitingList: false,
  dogAllocated: false,
  goneHome: false,
};

assert.equal(BUYER_JOURNEY_STEPS.length, 8);
assert.equal(deriveBuyerJourneyStep(blank), 1);

assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    hasApplication: true,
    applicationStatus: 'submitted',
  }),
  2,
);
assert.equal(buyerJourneyStepLabel(2, false), 'We review it personally');
assert.equal(buyerJourneyStepLabel(2, true), 'Application approved');

assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    hasApplication: true,
    applicationStatus: 'approved',
    applicationApproved: true,
  }),
  2,
);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    hasApplication: true,
    applicationApproved: true,
    portalAccessed: true,
  }),
  3,
);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    hasApplication: true,
    applicationApproved: true,
    portalAccessed: true,
    hasQuoteSent: true,
  }),
  4,
);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    hasQuoteSent: true,
    hasProofUploaded: true,
  }),
  5,
);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    paymentConfirmed: true,
    onWaitingList: true,
  }),
  6,
);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    paymentConfirmed: true,
    dogAllocated: true,
  }),
  7,
);
assert.equal(isWaitlistStepSkipped({ onWaitingList: false, dogAllocated: true }), true);
assert.equal(isWaitlistStepSkipped({ onWaitingList: true, dogAllocated: true }), false);
assert.equal(isWaitlistStepSkipped({ onWaitingList: false, dogAllocated: false }), false);
assert.equal(isEarnedWaitingListPlace({ payment_status: 'not_paid' }), false);
assert.equal(
  isEarnedWaitingListPlace({ payment_status: 'not_paid', deposit_invoice_id: 'inv-1' }),
  true,
);
assert.equal(isEarnedWaitingListPlace({ payment_status: 'deposit_paid' }), true);
assert.equal(
  deriveBuyerJourneyStep({
    ...blank,
    dogAllocated: true,
    goneHome: true,
  }),
  8,
);

console.log('buyerJourney.test.ts ok');
