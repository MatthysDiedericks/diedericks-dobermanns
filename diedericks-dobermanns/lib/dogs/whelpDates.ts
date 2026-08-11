import { parseISO } from 'date-fns';

function addDays(isoDate: string, days: number): string {
  const d = parseISO(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whelp-date maths shared with the website (`diedericksdobermann-web/src/lib/heats/whelpDates.ts`).
 * Keep both copies identical — clients see both apps.
 *
 * Basis (in priority order):
 * 1. Ovulation known → +63 (window 60–66)
 * 2. Last mating → +63 (window 57–65)
 * 3. Heat start → +75 (DogBreederPro-style fallback when no mating captured)
 */

export type WhelpBasis = 'ovulation' | 'last_mating' | 'heat_start' | 'stored_expected';

export interface WhelpWindow {
  earliest: string;
  expected: string;
  latest: string;
  basis: WhelpBasis;
  basisLabel: string;
}

export interface GoHomeWindow {
  earliest: string;
  standard: string;
  latest: string;
}

export function whelpWindow(
  ovulationDate: string | null | undefined,
  matingDate: string | null | undefined,
  expectedWhelpDate?: string | null,
  heatStartDate?: string | null,
  lastMatingDate?: string | null,
): WhelpWindow {
  if (ovulationDate) {
    return {
      earliest: addDays(ovulationDate, 60),
      expected: addDays(ovulationDate, 63),
      latest: addDays(ovulationDate, 66),
      basis: 'ovulation',
      basisLabel:
        '63 days from ovulation (±3 days). Confirm with reverse progesterone if the window matters.',
    };
  }

  const mating = lastMatingDate ?? matingDate;
  if (mating) {
    return {
      earliest: addDays(mating, 57),
      expected: addDays(mating, 63),
      latest: addDays(mating, 65),
      basis: 'last_mating',
      basisLabel:
        '63 days from mating (±4 days). Confirm ovulation by progesterone to narrow this.',
    };
  }

  if (heatStartDate) {
    return {
      earliest: addDays(heatStartDate, 71),
      expected: addDays(heatStartDate, 75),
      latest: addDays(heatStartDate, 79),
      basis: 'heat_start',
      basisLabel:
        '75 days from heat start — fallback used when no mating is recorded. Capture the mating to improve this.',
    };
  }

  const fallback = expectedWhelpDate ?? new Date().toISOString().slice(0, 10);
  return {
    earliest: addDays(fallback, -3),
    expected: fallback,
    latest: addDays(fallback, 3),
    basis: 'stored_expected',
    basisLabel: 'Stored expected whelp date (±3 days). Basis unknown.',
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

/** Format a due-date line that always states its basis. */
export function formatDueBasis(window: WhelpWindow, formatDate: (iso: string) => string): string {
  return `Due ${formatDate(window.expected)} (${window.basisLabel})`;
}
