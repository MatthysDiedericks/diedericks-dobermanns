/**
 * The ten values public.dogs.status accepts. This list mirrors the database
 * check constraint dogs_status_check — if you add a status here you must add
 * it to the constraint in the same change, or every save of that value fails.
 */
export const DOG_STATUSES = [
  { value: "available",   label: "For sale" },
  { value: "reserved",    label: "Reserved" },
  { value: "sold",        label: "Sold" },
  { value: "in_training", label: "In training" },
  { value: "keep",        label: "Kept — breeding" },
  { value: "stud",        label: "Stud" },
  { value: "retired",     label: "Retired" },
  { value: "deceased",    label: "Deceased" },
  { value: "donated",     label: "Donated" },
  { value: "gifted",      label: "Gifted" },
] as const;

export type DogStatus = (typeof DOG_STATUSES)[number]["value"];

export const DOG_STATUS_VALUES = DOG_STATUSES.map((s) => s.value) as [
  DogStatus,
  ...DogStatus[],
];

export const NO_BUYER_RECORDED_MESSAGE = "No buyer recorded for this dog.";

export function isDogStatus(value: string | null | undefined): value is DogStatus {
  return Boolean(value && (DOG_STATUS_VALUES as readonly string[]).includes(value));
}

export function dogStatusLabel(value: string | null | undefined): string {
  return DOG_STATUSES.find((s) => s.value === value)?.label ?? value ?? "";
}

export function soldMissingBuyer(dog: {
  new_owner_name?: string | null;
  buyer_contact_id?: string | null;
}): boolean {
  return !dog.new_owner_name?.trim() && !dog.buyer_contact_id;
}

/** Today's date (YYYY-MM-DD) when moving to deceased with no date already stored. */
export function deceasedAtStamp(
  status: DogStatus,
  currentDeceasedAt: string | null | undefined,
): string | undefined {
  if (status !== "deceased" || currentDeceasedAt) return undefined;
  return new Date().toISOString().slice(0, 10);
}

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
