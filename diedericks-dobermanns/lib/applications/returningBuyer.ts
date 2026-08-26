import { formatKennelDate } from '@/lib/kennel/formatters';

export function returningBuyerLine(input: {
  dogName: string | null;
  collectedOn: string | null;
} | null): string {
  if (!input?.dogName) return 'Second application — returning buyer';
  if (!input.collectedOn) return `Second application — first dog ${input.dogName}`;
  return `Second application — first dog ${input.dogName}, collected ${formatKennelDate(input.collectedOn)}`;
}
