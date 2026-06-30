import { differenceInDays, parseISO } from 'date-fns';

export type DueChipStatus =
  | 'overdue'
  | 'due_soon'
  | 'due_month'
  | 'up_to_date'
  | 'not_scheduled';

export interface DueChipStyle {
  label: string;
  bg: string;
  text: string;
}

export function dueStatus(nextDue: string | null | undefined): DueChipStatus {
  if (!nextDue) return 'not_scheduled';
  try {
    const days = differenceInDays(parseISO(nextDue), new Date());
    if (days < 0) return 'overdue';
    if (days <= 14) return 'due_soon';
    if (days <= 30) return 'due_month';
    return 'up_to_date';
  } catch {
    return 'not_scheduled';
  }
}

export function dueChipStyle(status: DueChipStatus): DueChipStyle {
  switch (status) {
    case 'overdue':
      return { label: 'OVERDUE', bg: '#C0392B33', text: '#EF4444' };
    case 'due_soon':
      return { label: 'DUE SOON', bg: '#FB923C33', text: '#FB923C' };
    case 'due_month':
      return { label: 'DUE THIS MONTH', bg: '#C4A35A33', text: '#C4A35A' };
    case 'up_to_date':
      return { label: 'UP TO DATE', bg: '#27AE6033', text: '#27AE60' };
    default:
      return { label: 'NOT SCHEDULED', bg: '#8C847433', text: '#8C8474' };
  }
}

export function urgencyColor(daysUntil: number): string {
  if (daysUntil < 0 || daysUntil < 7) return '#EF4444';
  if (daysUntil <= 14) return '#FB923C';
  return '#C4A35A';
}

export function daysUntilDate(iso: string): number {
  try {
    return differenceInDays(parseISO(iso), new Date());
  } catch {
    return 999;
  }
}
