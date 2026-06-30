import { differenceInDays, parseISO } from 'date-fns';

export type ExpiryStatus = 'expired' | 'expiring' | 'ok' | 'none';

export function expiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  if (!expiryDate) return 'none';
  try {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'ok';
  } catch {
    return 'none';
  }
}

export function expiryLabel(expiryDate: string | null | undefined): string | null {
  if (!expiryDate) return null;
  try {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today';
    return `Expires in ${days} days`;
  } catch {
    return null;
  }
}

export function expiryColor(status: ExpiryStatus): string {
  if (status === 'expired') return '#EF4444';
  if (status === 'expiring') return '#FB923C';
  return '#8C8474';
}
