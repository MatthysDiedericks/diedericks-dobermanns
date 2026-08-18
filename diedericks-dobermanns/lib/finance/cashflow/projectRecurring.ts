import { addMonths, addQuarters, addYears, format, parseISO } from "date-fns";

export type RecurringSeed = {
  id: string;
  amount: number;
  description: string;
  categoryId: string | null;
  categoryName: string;
  interval: string | null;
  startDate: string;
  endDate: string | null;
};

export type ProjectedOut = {
  id: string;
  date: string;
  amount: number;
  description: string;
  categoryId: string | null;
  categoryName: string;
  kind: "payable" | "recurring" | "budget";
  basis: string;
};

function advance(date: Date, interval: string | null): Date {
  if (interval === "quarterly") return addQuarters(date, 1);
  if (interval === "annual") return addYears(date, 1);
  return addMonths(date, 1);
}

/** Future recurring dates from startDate, stopping at endDate and horizonEnd. */
export function projectRecurring(
  seed: RecurringSeed,
  horizonStart: string,
  horizonEnd: string,
): ProjectedOut[] {
  if (!seed.startDate) return [];
  const endCap = seed.endDate && seed.endDate < horizonEnd ? seed.endDate : horizonEnd;
  let cursor = parseISO(seed.startDate.slice(0, 10));
  if (Number.isNaN(cursor.getTime())) return [];

  const rows: ProjectedOut[] = [];
  let guard = 0;
  while (cursor <= parseISO(endCap) && guard < 48) {
    const iso = format(cursor, "yyyy-MM-dd");
    if (iso >= horizonStart && iso <= endCap) {
      if (!seed.endDate || iso <= seed.endDate) {
        rows.push({
          id: `${seed.id}:${iso}`,
          date: iso,
          amount: seed.amount,
          description: seed.description,
          categoryId: seed.categoryId,
          categoryName: seed.categoryName,
          kind: "recurring",
          basis: `projected ${seed.interval ?? "monthly"} until ${seed.endDate ?? "open"}`,
        });
      }
    }
    cursor = advance(cursor, seed.interval);
    guard += 1;
  }
  return rows;
}
