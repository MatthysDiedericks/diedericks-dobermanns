import { format, parseISO } from 'date-fns';

export type ProgenyDogRow = {
  id: string;
  sex: string | null;
  date_of_birth: string | null;
  litter_id: string | null;
};

export type ProgenySummary = {
  total: number;
  litterCount: number;
  males: number;
  females: number;
  firstDate: string | null;
  latestDate: string | null;
};

function monthYear(iso: string): string {
  try {
    return format(parseISO(iso.slice(0, 10)), 'MMM yyyy');
  } catch {
    return iso;
  }
}

/**
 * Headline counts from `dogs.father_id` / `dogs.mother_id` rows.
 * Litter-table joins undercount dogs that have a parent id but no litter_id.
 */
export function summariseProgeny(dogs: ProgenyDogRow[]): ProgenySummary {
  const unique = new Map<string, ProgenyDogRow>();
  for (const dog of dogs) unique.set(dog.id, dog);
  const rows = [...unique.values()];
  const litterIds = new Set(
    rows.map((d) => d.litter_id).filter((id): id is string => Boolean(id)),
  );
  const dates = rows
    .map((d) => d.date_of_birth)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 10))
    .sort();
  return {
    total: rows.length,
    litterCount: litterIds.size,
    males: rows.filter((d) => d.sex === 'male').length,
    females: rows.filter((d) => d.sex === 'female').length,
    firstDate: dates[0] ?? null,
    latestDate: dates[dates.length - 1] ?? null,
  };
}

/** Null when there are no progeny — callers must hide the block, not print "0 puppies". */
export function formatProgenySummaryLine(summary: ProgenySummary): string | null {
  if (summary.total <= 0) return null;
  const parts = [
    `${summary.total} ${summary.total === 1 ? 'puppy' : 'puppies'}`,
    `${summary.litterCount} ${summary.litterCount === 1 ? 'litter' : 'litters'}`,
    `${summary.males} males, ${summary.females} females`,
  ];
  if (summary.firstDate && summary.latestDate) {
    parts.push(
      `first ${monthYear(summary.firstDate)}, latest ${monthYear(summary.latestDate)}`,
    );
  } else if (summary.firstDate) {
    parts.push(`first ${monthYear(summary.firstDate)}`);
  } else if (summary.latestDate) {
    parts.push(`latest ${monthYear(summary.latestDate)}`);
  }
  return parts.join(' · ');
}
