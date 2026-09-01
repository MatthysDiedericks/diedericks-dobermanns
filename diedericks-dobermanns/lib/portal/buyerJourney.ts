export const BUYER_JOURNEY_STEPS = [
  'Application submitted',
  'Application approved',
  'Open your portal',
  'Quotation issued — pay your deposit',
  'Upload your proof of payment',
  'Invoiced and added to the waiting list',
  'Your puppy is allocated',
  'Go-home day',
] as const;

export type BuyerJourneyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type BuyerJourneyInput = {
  hasApplication: boolean;
  applicationStatus: string | null;
  applicationApproved: boolean;
  portalAccessed: boolean;
  hasQuoteSent: boolean;
  hasQuoteAccepted: boolean;
  hasProofUploaded: boolean;
  paymentConfirmed: boolean;
  onWaitingList: boolean;
  dogAllocated: boolean;
  goneHome: boolean;
};

/** Step 2's label depends on whether Matt has actually approved them. */
export function buyerJourneyStepLabel(
  step: BuyerJourneyStep,
  applicationApproved: boolean,
): string {
  if (step === 2) {
    return applicationApproved ? 'Application approved' : 'We review it personally';
  }
  return BUYER_JOURNEY_STEPS[step - 1];
}

/**
 * Step 6 is skippable: a puppy available immediately never joins the waiting
 * list. Skip only after allocation with no waitlist row — not while they might
 * still be placed on it.
 */
export function isWaitlistStepSkipped(
  input: Pick<BuyerJourneyInput, 'onWaitingList' | 'dogAllocated'>,
): boolean {
  return input.dogAllocated && !input.onWaitingList;
}

/** Step 6 is the place earned after payment — not a leftover quote-sent row. */
export function isEarnedWaitingListPlace(row: {
  deposit_invoice_id?: string | null;
  deposit_paid_date?: string | null;
  payment_status?: string | null;
}): boolean {
  if (row.deposit_invoice_id) return true;
  if (row.deposit_paid_date) return true;
  const paid = row.payment_status ?? 'not_paid';
  return paid !== 'not_paid';
}

/**
 * Derive the current journey step from real records — never a stored counter,
 * which would drift the moment anything is done by hand.
 * Step numbers match BUYER_JOURNEY_STEPS (1-indexed). Highest-reached first.
 */
export function deriveBuyerJourneyStep(input: BuyerJourneyInput): BuyerJourneyStep {
  if (input.goneHome) return 8;
  if (input.dogAllocated) return 7;
  if (input.onWaitingList) return 6;
  if (input.hasProofUploaded || input.paymentConfirmed) return 5;
  if (input.hasQuoteSent || input.hasQuoteAccepted) return 4;
  if (input.portalAccessed) return 3;
  if (input.hasApplication || input.applicationApproved) return 2;
  return 1;
}
