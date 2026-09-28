/**
 * On the litter page the wait is ordered by queue_anchor_at when that is set,
 * otherwise date_added.
 *
 * Those two disagree. queue_anchor_at is the fair place in line — it can be
 * moved back to the application's date when the waiting-list row was created
 * later. date_added is when this queue row itself was opened. created_at is
 * only the database insert and is not used here, because a rebuilt row would
 * look newer than someone who has actually been waiting.
 * Longest wait is the earliest of those anchors.
 */

export const LONG_WAIT_DAYS = 90;

export type LitterQueueEntry = {
  queue_anchor_at?: string | null;
  date_added?: string | null;
};

export function litterQueueAnchor(entry: LitterQueueEntry): string | null {
  const anchor = entry.queue_anchor_at?.trim();
  if (anchor) return anchor;
  const added = entry.date_added?.trim();
  return added || null;
}

export function daysWaiting(entry: LitterQueueEntry, now = new Date()): number | null {
  const anchor = litterQueueAnchor(entry);
  if (!anchor) return null;
  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const from = new Date(start);
  from.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - from.getTime()) / 86_400_000));
}

export function isLongWait(days: number | null): boolean {
  return days != null && days > LONG_WAIT_DAYS;
}

/** Longest wait first. Missing anchors go last. */
export function compareLongestWait(a: LitterQueueEntry, b: LitterQueueEntry): number {
  const aa = litterQueueAnchor(a);
  const bb = litterQueueAnchor(b);
  if (aa && bb) return aa.localeCompare(bb);
  if (aa) return -1;
  if (bb) return 1;
  return 0;
}
