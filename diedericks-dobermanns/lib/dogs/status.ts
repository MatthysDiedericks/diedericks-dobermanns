/**
 * Which dogs count as kennel stock. Kept in one place because the breeding,
 * heat and health screens must agree: a dam shown on the breeding planner that
 * is missing from the heat list looks like lost data, not a filter difference.
 *
 * The status is recorded inconsistently in older rows — some as a category,
 * some as a status — so both are accepted.
 */
export const KENNEL_STOCK_FILTER =
  'category.eq.breeding_stock,status.eq.breeding_stock,status.eq.stud,status.eq.keep';

/** Postgrest filter steps used by active kennel stock queries. */
interface ActiveKennelStockQueryable<T> {
  or(filters: string): T;
  neq(column: string, value: string): T;
  is(column: string, value: null): T;
}

/**
 * Kennel stock the kennel still manages day-to-day — heats, health tasks,
 * breeding stock lists. Excludes deceased dogs even when category still says
 * breeding_stock (ancestors kept for pedigree history).
 */
export function applyActiveKennelStockFilter<T extends ActiveKennelStockQueryable<T>>(
  query: T,
): T {
  return query
    .or(KENNEL_STOCK_FILTER)
    .neq('status', 'deceased')
    .is('deceased_at', null);
}
