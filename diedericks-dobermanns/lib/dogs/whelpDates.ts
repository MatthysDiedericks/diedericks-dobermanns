import { addDays } from '@/lib/heats/calculations';

export interface WhelpWindow {
  earliest: string;
  expected: string;
  latest: string;
}

export interface GoHomeWindow {
  earliest: string;
  standard: string;
  latest: string;
}

/** Whelp window from ovulation (preferred) or mating date. */
export function whelpWindow(
  ovulationDate: string | null | undefined,
  matingDate: string | null | undefined,
  expectedWhelpDate?: string | null,
): WhelpWindow {
  if (ovulationDate) {
    return {
      earliest: addDays(ovulationDate, 60),
      expected: addDays(ovulationDate, 63),
      latest: addDays(ovulationDate, 66),
    };
  }
  if (matingDate) {
    return {
      earliest: addDays(matingDate, 57),
      expected: addDays(matingDate, 60),
      latest: addDays(matingDate, 65),
    };
  }
  const fallback = expectedWhelpDate ?? new Date().toISOString().slice(0, 10);
  return {
    earliest: addDays(fallback, -3),
    expected: fallback,
    latest: addDays(fallback, 3),
  };
}

/** Go-home window from expected whelp date (weeks after birth). */
export function goHomeWindow(expectedWhelpDate: string): GoHomeWindow {
  return {
    earliest: addDays(expectedWhelpDate, 8 * 7),
    standard: addDays(expectedWhelpDate, 9 * 7),
    latest: addDays(expectedWhelpDate, 10 * 7),
  };
}
