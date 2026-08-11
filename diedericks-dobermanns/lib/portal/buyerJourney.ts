export const BUYER_JOURNEY_STEPS = [
  'Application submitted',
  'We review it personally',
  'Quotation issued to your portal',
  'You accept and pay the deposit',
  'You upload your proof of payment',
  'Your puppy is allocated',
  'Go-home day',
] as const;

export type BuyerJourneyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type BuyerJourneyInput = {
  hasApplication: boolean;
  applicationStatus: string | null;
  hasQuoteSent: boolean;
  hasQuoteAccepted: boolean;
  hasProofUploaded: boolean;
  paymentConfirmed: boolean;
  dogAllocated: boolean;
};

/**
 * Derive the current journey step from real records — never a stored counter.
 * Step numbers match BUYER_JOURNEY_STEPS (1-indexed).
 */
export function deriveBuyerJourneyStep(input: BuyerJourneyInput): BuyerJourneyStep {
  if (input.dogAllocated) return 7;
  if (input.paymentConfirmed) return 6;
  if (input.hasProofUploaded) return 5;
  if (input.hasQuoteAccepted) return 4;
  if (input.hasQuoteSent) return 3;
  if (
    input.hasApplication &&
    (input.applicationStatus === 'submitted' ||
      input.applicationStatus === 'under_review' ||
      input.applicationStatus === 'info_requested' ||
      input.applicationStatus === 'approved')
  ) {
    return 2;
  }
  if (input.hasApplication) return 2;
  return 1;
}
