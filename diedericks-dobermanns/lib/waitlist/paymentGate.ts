/** Shared waitlist payment-gate helpers. Keep in lockstep with
 *  diedericksdobermann-web/src/lib/waitlist/paymentGate.ts */

export const WAITLIST_PAYMENT_REQUIRED = 'WAITLIST_PAYMENT_REQUIRED';

export function isWaitlistPaymentGateError(message: string | null | undefined): boolean {
  return Boolean(message && message.includes(WAITLIST_PAYMENT_REQUIRED));
}

export const PAYMENT_GATE_MESSAGE =
  'A recorded payment is required before adding someone to the waiting list. Approval is not enough.';

export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now.getTime() - start) / 86_400_000));
}

export function awaitingPaymentLabel(reviewedAt: string | null | undefined, now = new Date()): string {
  const days = daysSince(reviewedAt, now);
  if (days == null) return 'Approved — awaiting payment';
  if (days === 0) return 'Approved — awaiting payment · today';
  if (days === 1) return 'Approved — awaiting payment · 1 day';
  return `Approved — awaiting payment · ${days} days`;
}
