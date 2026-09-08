/** Queue standing is the application's created_at, never the row's date_added. */
export function queueAnchorAt(entry: {
  queue_anchor_at?: string | null;
  date_added?: string | null;
  created_at: string;
}): string {
  return entry.queue_anchor_at ?? entry.date_added ?? entry.created_at;
}

export function compareQueueOrder<
  T extends {
    queue_anchor_at?: string | null;
    date_added?: string | null;
    created_at: string;
    request_index?: number | null;
  },
>(a: T, b: T): number {
  const byAnchor = queueAnchorAt(a).localeCompare(queueAnchorAt(b));
  if (byAnchor !== 0) return byAnchor;
  return (a.request_index ?? 1) - (b.request_index ?? 1);
}
