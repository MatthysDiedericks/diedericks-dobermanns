/** Display helpers for the quote reminder / lapse ladder. Day counts are settings. */

export const DEFAULT_REMINDER_FIRST_DAYS = 30;
export const DEFAULT_REMINDER_FINAL_DAYS = 60;
export const DEFAULT_LAPSE_DAYS = 90;

export type QuoteLapseFields = {
  status: string;
  sent_at?: string | null;
  last_client_activity_at?: string | null;
  reminder_first_sent_at?: string | null;
  reminder_final_sent_at?: string | null;
  lapse_hold_until?: string | null;
  valid_until?: string | null;
};

export function quoteClockStart(sentAt: string | null, lastActivity: string | null): Date | null {
  if (!sentAt) return null;
  const sent = new Date(sentAt);
  if (!lastActivity) return sent;
  const activity = new Date(lastActivity);
  return activity > sent ? activity : sent;
}

export function daysOnClock(sentAt: string | null, lastActivity: string | null, now = new Date()): number | null {
  const start = quoteClockStart(sentAt, lastActivity);
  if (!start) return null;
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

export function isQuoteOnHold(holdUntil: string | null | undefined, today = new Date()): boolean {
  if (!holdUntil) return false;
  const hold = holdUntil.slice(0, 10);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return hold >= `${y}-${m}-${d}`;
}

export function formatHoldUntil(holdUntil: string): string {
  const dt = new Date(`${holdUntil.slice(0, 10)}T00:00:00`);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function holdChipLabel(holdUntil: string): string {
  return `On hold until ${formatHoldUntil(holdUntil)}`;
}

export function isLapsingSoon(
  quote: QuoteLapseFields,
  finalDays = DEFAULT_REMINDER_FINAL_DAYS,
  now = new Date(),
): boolean {
  if (quote.status !== 'sent' || !quote.sent_at) return false;
  const days = daysOnClock(quote.sent_at, quote.last_client_activity_at ?? null, now);
  return days !== null && days >= finalDays;
}

export function reminderProgressLabel(quote: QuoteLapseFields): string | null {
  if (quote.status !== 'sent' || !quote.sent_at) return null;
  const days = daysOnClock(quote.sent_at, quote.last_client_activity_at ?? null);
  if (days === null) return null;
  const parts = [`Day ${days}`];
  if (quote.reminder_final_sent_at) parts.push('final notice sent');
  else if (quote.reminder_first_sent_at) parts.push('first reminder sent');
  else parts.push('no reminder yet');
  return parts.join(' · ');
}
