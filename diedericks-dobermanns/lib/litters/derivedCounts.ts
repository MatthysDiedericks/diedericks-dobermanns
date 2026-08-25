/**
 * Available / total puppy counts derived from the puppy rows themselves.
 * Stored `available_count` is a denormalised number and drifts — we show
 * the derived figure and only use the stored value when no puppies exist.
 */

export type PuppyCountSlice = {
  litter_id: string | null;
  status: string | null;
  owner_id: string | null;
  reserved_for_name: string | null;
  new_owner_name: string | null;
};

export type DerivedLitterCount = {
  available: number;
  total: number;
  storedAvailable: number | null;
  storedTotal: number | null;
  /** True when puppy rows exist and disagree with the stored available_count. */
  mismatch: boolean;
  /** True when the numbers came from puppy rows, not the stored columns. */
  fromPuppies: boolean;
};

const DEAD = new Set(['deceased', 'stillborn']);
const TAKEN = new Set(['sold', 'reserved', 'retained', 'keep', 'placed']);

export function isDeceasedStatus(status: string | null | undefined): boolean {
  return DEAD.has((status ?? '').toLowerCase());
}

export function puppyCountsAsAvailable(p: {
  status: string | null;
  owner_id?: string | null;
  reserved_for_name?: string | null;
  new_owner_name?: string | null;
}): boolean {
  const status = (p.status ?? '').toLowerCase();
  if (DEAD.has(status) || TAKEN.has(status)) return false;
  if (p.owner_id) return false;
  if (p.reserved_for_name?.trim()) return false;
  if (p.new_owner_name?.trim()) return false;
  return true;
}

export function deriveLitterCount(
  slices: PuppyCountSlice[] | undefined,
  stored: { available_count: number | null; puppy_count: number | null },
): DerivedLitterCount {
  const rows = slices ?? [];
  if (rows.length === 0) {
    return {
      available: stored.available_count ?? 0,
      total: stored.puppy_count ?? 0,
      storedAvailable: stored.available_count,
      storedTotal: stored.puppy_count,
      mismatch: false,
      fromPuppies: false,
    };
  }
  const available = rows.filter(puppyCountsAsAvailable).length;
  return {
    available,
    total: rows.length,
    storedAvailable: stored.available_count,
    storedTotal: stored.puppy_count,
    mismatch: stored.available_count != null && stored.available_count !== available,
    fromPuppies: true,
  };
}

export function groupPuppySlicesByLitter(
  rows: PuppyCountSlice[],
): Map<string, PuppyCountSlice[]> {
  const map = new Map<string, PuppyCountSlice[]>();
  for (const row of rows) {
    if (!row.litter_id) continue;
    const list = map.get(row.litter_id);
    if (list) list.push(row);
    else map.set(row.litter_id, [row]);
  }
  return map;
}

export function buildDerivedCountsByLitter(
  slices: PuppyCountSlice[],
  litters: { id: string; available_count: number | null; puppy_count: number | null }[],
): Record<string, DerivedLitterCount> {
  const grouped = groupPuppySlicesByLitter(slices);
  const out: Record<string, DerivedLitterCount> = {};
  for (const litter of litters) {
    out[litter.id] = deriveLitterCount(grouped.get(litter.id), {
      available_count: litter.available_count,
      puppy_count: litter.puppy_count,
    });
  }
  return out;
}

export function formatLitterCount(count: DerivedLitterCount): string {
  if (!count.fromPuppies && count.storedAvailable == null && !count.storedTotal) {
    return '—';
  }
  if (!count.fromPuppies && !count.total) {
    return count.storedAvailable != null ? String(count.storedAvailable) : '—';
  }
  return `${count.available} / ${count.total}`;
}

export function litterHasRecordedPuppies(count: DerivedLitterCount): boolean {
  return count.fromPuppies || (count.storedTotal ?? 0) > 0;
}
