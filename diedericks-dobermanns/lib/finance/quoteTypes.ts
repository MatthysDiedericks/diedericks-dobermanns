/** Quote / invoice headline types. Mixed puppy + training stays dog_sale. */

export const REVENUE_TYPES = ['dog_sale', 'training', 'board_train', 'stud_fee', 'other'] as const;
export type RevenueType = (typeof REVENUE_TYPES)[number];

export const REVENUE_TYPE_FILTERS = ['all', 'dogs', 'training', 'other'] as const;
export type RevenueTypeFilter = (typeof REVENUE_TYPE_FILTERS)[number];

export const REVENUE_TYPE_STORAGE_KEY = 'finance-revenue-type-filter';

const TRAINING_LINE = new Set(['training', 'board_train']);

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  dog_sale: 'Dogs',
  training: 'Training',
  board_train: 'Board & train',
  stud_fee: 'Stud fee',
  other: 'Other',
};

export const REVENUE_FILTER_LABELS: Record<RevenueTypeFilter, string> = {
  all: 'All',
  dogs: 'Dogs',
  training: 'Training',
  other: 'Other',
};

export function isRevenueType(value: string | null | undefined): value is RevenueType {
  return REVENUE_TYPES.includes(value as RevenueType);
}

export function parseRevenueType(value: string | null | undefined): RevenueType {
  return isRevenueType(value) ? value : 'dog_sale';
}

export function parseRevenueTypeFilter(value: string | null | undefined): RevenueTypeFilter {
  return REVENUE_TYPE_FILTERS.includes(value as RevenueTypeFilter)
    ? (value as RevenueTypeFilter)
    : 'all';
}

/**
 * Default headline type from line item_type values.
 * Any dog line → dog_sale. Predominantly training → training or board_train.
 * Mixed puppy + board & train stays dog_sale.
 */
export function defaultQuoteTypeFromLines(lines: { item_type: string }[]): RevenueType {
  const types = lines.map((l) => l.item_type).filter(Boolean);
  if (types.length === 0) return 'dog_sale';
  if (types.some((t) => t === 'dog' || t === 'dog_sale')) return 'dog_sale';

  const training = types.filter((t) => TRAINING_LINE.has(t));
  if (training.length === 0) {
    if (types.every((t) => t === 'other' || t === 'stud_fee')) {
      return types.some((t) => t === 'stud_fee') ? 'stud_fee' : 'other';
    }
    return 'dog_sale';
  }
  if (training.length < types.length && training.length <= types.length / 2) {
    return 'dog_sale';
  }
  const board = training.filter((t) => t === 'board_train').length;
  const train = training.filter((t) => t === 'training').length;
  return board > train ? 'board_train' : 'training';
}

export function matchesRevenueTypeFilter(
  type: string | null | undefined,
  filter: RevenueTypeFilter,
): boolean {
  if (filter === 'all') return true;
  const parsed = parseRevenueType(type);
  if (filter === 'dogs') return parsed === 'dog_sale';
  if (filter === 'training') return parsed === 'training' || parsed === 'board_train';
  return parsed === 'stud_fee' || parsed === 'other';
}

export function splitRevenueByType(
  invoices: { invoice_type?: string | null; amount_paid?: number | null }[],
): { label: string; amount: number }[] {
  const map = new Map<RevenueType, number>();
  for (const inv of invoices) {
    const key = parseRevenueType(inv.invoice_type);
    map.set(key, (map.get(key) ?? 0) + Number(inv.amount_paid ?? 0));
  }
  return [...map.entries()]
    .map(([type, amount]) => ({ label: REVENUE_TYPE_LABELS[type], amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function defaultInvoiceTypeFromLines(
  lines: { item_type: string }[],
): RevenueType {
  const mapped = lines.map((l) => ({
    item_type:
      l.item_type === 'dog_sale' || l.item_type === 'deposit'
        ? 'dog'
        : l.item_type === 'training_fee'
          ? 'training'
          : l.item_type,
  }));
  return defaultQuoteTypeFromLines(mapped);
}
