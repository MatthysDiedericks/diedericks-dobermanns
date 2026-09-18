import { addMonths, addYears, format, parseISO } from 'date-fns';

/** Next due date from a treatment date and a product / form schedule. */
export function suggestNextDueDate(
  date: string,
  scheduleType: string | null | undefined,
): string {
  if (!date || !scheduleType) return '';
  try {
    const given = parseISO(date.slice(0, 10));
    if (Number.isNaN(given.getTime())) return '';
    if (scheduleType === 'monthly') return format(addMonths(given, 1), 'yyyy-MM-dd');
    if (scheduleType === 'quarterly') return format(addMonths(given, 3), 'yyyy-MM-dd');
    if (scheduleType === 'biannual') return format(addMonths(given, 6), 'yyyy-MM-dd');
    if (scheduleType === 'annual') return format(addYears(given, 1), 'yyyy-MM-dd');
  } catch {
    return '';
  }
  return '';
}
