/**
 * Statuses where a buyer actually collects the dog.
 * A keep / breeding dog inherits the litter's go-home date, which is her age,
 * and must not be labelled as collected.
 */
const COLLECTION_STATUSES = new Set(["sold", "donated", "gifted", "reserved"]);

/** This dog's own collection date. Never a litter go-home date. */
export function dogCollectionDate(dog: {
  status?: string | null;
  handover_date?: string | null;
  delivered_at?: string | null;
}): string | null {
  const status = (dog.status ?? "").toLowerCase();
  if (!COLLECTION_STATUSES.has(status)) return null;
  const delivered = dog.delivered_at?.slice(0, 10) || null;
  const handover = dog.handover_date?.slice(0, 10) || null;
  if (status === "reserved") return handover;
  return delivered || handover;
}
