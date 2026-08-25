export function collectionCountdown(goHomeDate: string | null | undefined): string | null {
  if (!goHomeDate) return null;
  const target = new Date(`${goHomeDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return null;
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Collection is today';
  if (days === 1) return '1 day to go';
  if (days > 1) return `${days} days to go`;
  if (days === -1) return 'Collection was yesterday';
  return `Collected ${Math.abs(days)} days ago`;
}
