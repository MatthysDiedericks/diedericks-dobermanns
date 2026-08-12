/**
 * Litter list sort + dam/year filters — shared logic for admin litters screens.
 * Dam and year options are always derived from the loaded litters, never hard-coded.
 */

export type LitterSortOrder = 'newest' | 'oldest';

export type LitterListPrefs = {
  sort: LitterSortOrder;
  /** mother dog id */
  damId: string | null;
  year: number | null;
};

export const DEFAULT_LITTER_LIST_PREFS: LitterListPrefs = {
  sort: 'newest',
  damId: null,
  year: null,
};

export const LITTER_LIST_PREFS_KEY = 'dd-admin-litters-prefs';

export type LitterFilterable = {
  id: string;
  status?: string | null;
  actual_date: string | null;
  expected_date: string | null;
  mother_id?: string | null;
  mother?: { id: string; name: string } | null;
};

export type DamOption = { id: string; name: string; count: number };
export type YearOption = { year: number; count: number };

/** Date used for sorting: expected litters use expected_date so they stay visible. */
export function litterSortDate(litter: LitterFilterable): string | null {
  const status = (litter.status ?? '').toLowerCase();
  if (status === 'expected') return litter.expected_date;
  return litter.actual_date ?? litter.expected_date;
}

/** Year for the year filter: actual_date, falling back to expected_date. */
export function litterFilterYear(litter: LitterFilterable): number | null {
  const raw = litter.actual_date ?? litter.expected_date;
  if (!raw) return null;
  const y = new Date(raw).getFullYear();
  return Number.isFinite(y) ? y : null;
}

function motherId(litter: LitterFilterable): string | null {
  return litter.mother_id ?? litter.mother?.id ?? null;
}

function motherName(litter: LitterFilterable): string | null {
  return litter.mother?.name ?? null;
}

/** Females that have at least one litter, ordered by count desc then name. */
export function buildDamOptions(litters: LitterFilterable[]): DamOption[] {
  const map = new Map<string, DamOption>();
  for (const l of litters) {
    const id = motherId(l);
    const name = motherName(l);
    if (!id || !name) continue;
    const existing = map.get(id);
    if (existing) existing.count += 1;
    else map.set(id, { id, name, count: 1 });
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Years present on litters with counts, newest year first. */
export function buildYearOptions(litters: LitterFilterable[]): YearOption[] {
  const map = new Map<number, number>();
  for (const l of litters) {
    const y = litterFilterYear(l);
    if (y == null) continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

export function filterAndSortLitters<T extends LitterFilterable>(
  litters: T[],
  prefs: LitterListPrefs,
): T[] {
  let rows = litters;
  if (prefs.damId) {
    rows = rows.filter((l) => motherId(l) === prefs.damId);
  }
  if (prefs.year != null) {
    rows = rows.filter((l) => litterFilterYear(l) === prefs.year);
  }

  const ascending = prefs.sort === 'oldest';
  return [...rows].sort((a, b) => {
    const da = litterSortDate(a);
    const db = litterSortDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    const cmp = da.localeCompare(db);
    return ascending ? cmp : -cmp;
  });
}

export function litterPrefsActive(prefs: LitterListPrefs): boolean {
  return prefs.damId != null || prefs.year != null;
}

export function emptyLittersMessage(
  prefs: LitterListPrefs,
  dams: DamOption[],
): string {
  const dam = prefs.damId ? dams.find((d) => d.id === prefs.damId)?.name : null;
  if (dam && prefs.year != null) return `No litters for ${dam} in ${prefs.year}.`;
  if (dam) return `No litters for ${dam}.`;
  if (prefs.year != null) return `No litters recorded for ${prefs.year}.`;
  return 'No litters yet.';
}

export function parseLitterListPrefs(raw: string | null): LitterListPrefs {
  if (!raw) return { ...DEFAULT_LITTER_LIST_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<LitterListPrefs>;
    const sort: LitterSortOrder = parsed.sort === 'oldest' ? 'oldest' : 'newest';
    const damId =
      typeof parsed.damId === 'string' && parsed.damId.length > 0 ? parsed.damId : null;
    const year =
      typeof parsed.year === 'number' && Number.isFinite(parsed.year) ? parsed.year : null;
    return { sort, damId, year };
  } catch {
    return { ...DEFAULT_LITTER_LIST_PREFS };
  }
}

export function serializeLitterListPrefs(prefs: LitterListPrefs): string {
  return JSON.stringify(prefs);
}
