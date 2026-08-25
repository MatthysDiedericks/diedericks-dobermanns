export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function weekSortKey(weekLabel: string | null | undefined, sortOrder: number): number {
  if (!weekLabel) return 10_000 + sortOrder;
  const match = weekLabel.match(/(\d+)/);
  return match ? Number(match[1]) : 10_000 + sortOrder;
}

export function sortVideos<T extends { week_label: string | null; sort_order: number }>(
  videos: T[],
): T[] {
  return [...videos].sort(
    (a, b) => weekSortKey(a.week_label, a.sort_order) - weekSortKey(b.week_label, b.sort_order),
  );
}
