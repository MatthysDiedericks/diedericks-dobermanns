import { addDays } from 'date-fns';

import { getAgeDays } from '@/lib/litters/weighingSchedule';

export interface Milestone {
  key: string;
  label: string;
  ageDays: number;
  /** ISO date (yyyy-mm-dd) this milestone falls on. */
  date: string | null;
  reached: boolean;
}

/**
 * Standard Dobermann puppy developmental stages, offset in days from whelp
 * date. There is no milestones table — these are derived, not stored.
 */
const STANDARD_MILESTONES: { key: string; label: string; ageDays: number }[] = [
  { key: 'born', label: 'Born', ageDays: 0 },
  { key: 'eyes_ears_open', label: 'Eyes & ears open', ageDays: 14 },
  { key: 'weaning_starts', label: 'Weaning starts', ageDays: 21 },
  { key: 'fully_weaned', label: 'Fully weaned', ageDays: 42 },
  { key: 'first_vaccination', label: 'First vaccination', ageDays: 42 },
  { key: 'go_home_ready', label: 'Go-home ready', ageDays: 56 },
];

/**
 * Derives an age-based milestone strip from a litter's whelp date.
 * `goHomeDate` (an explicit breeder-set date) or `goHomeWeeks` override the
 * default 8-week "go-home ready" estimate when set.
 */
export function deriveMilestones(
  whelpDate: string | null | undefined,
  goHomeDate?: string | null,
  goHomeWeeks?: number | null,
): Milestone[] {
  if (!whelpDate) return [];
  const currentAgeDays = getAgeDays(whelpDate);
  const whelp = new Date(whelpDate.slice(0, 10));

  return STANDARD_MILESTONES.map((m) => {
    let ageDays = m.ageDays;
    let date: string | null = null;

    if (m.key === 'go_home_ready') {
      if (goHomeDate) {
        date = goHomeDate.slice(0, 10);
        ageDays = getAgeDays(whelpDate, new Date(goHomeDate));
      } else if (goHomeWeeks) {
        ageDays = goHomeWeeks * 7;
      }
    }

    if (date == null) {
      date = addDays(whelp, ageDays).toISOString().slice(0, 10);
    }

    return {
      key: m.key,
      label: m.label,
      ageDays,
      date,
      reached: currentAgeDays >= ageDays,
    };
  });
}
