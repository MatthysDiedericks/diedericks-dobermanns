import { differenceInCalendarDays, parseISO } from 'date-fns';

export type HealthCalendarKind = 'vaccination' | 'deworming';

export type HealthCalendarUpcoming = {
  id: string;
  kind: HealthCalendarKind;
  title: string;
  dueDate: string;
  daysUntil: number;
};

export type HealthCalendarHistory = {
  id: string;
  kind: HealthCalendarKind;
  title: string;
  eventDate: string;
  administeredBy: string | null;
};

export type HealthCalendar = {
  upcoming: HealthCalendarUpcoming[];
  history: HealthCalendarHistory[];
};

export type VaccinationLike = {
  id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  administered_by?: string | null;
  doctor_name?: string | null;
};

export type DewormingLike = {
  id: string;
  product_name: string;
  treatment_date: string;
  next_due_date: string | null;
  administered_by?: string | null;
  doctor_name?: string | null;
};

function daysUntil(iso: string, now = new Date()): number {
  try {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return differenceInCalendarDays(parseISO(iso.slice(0, 10)), today);
  } catch {
    return 0;
  }
}

function who(row: { administered_by?: string | null; doctor_name?: string | null }): string | null {
  return row.administered_by?.trim() || row.doctor_name?.trim() || null;
}

export function buildHealthCalendar(
  vaccinations: VaccinationLike[],
  deworming: DewormingLike[],
  now = new Date(),
): HealthCalendar {
  const upcoming: HealthCalendarUpcoming[] = [];
  const history: HealthCalendarHistory[] = [];

  for (const v of vaccinations) {
    if (v.next_due_date) {
      upcoming.push({
        id: `vax-${v.id}`,
        kind: 'vaccination',
        title: v.vaccine_name,
        dueDate: v.next_due_date,
        daysUntil: daysUntil(v.next_due_date, now),
      });
    }
    history.push({
      id: `vax-h-${v.id}`,
      kind: 'vaccination',
      title: v.vaccine_name,
      eventDate: v.date_administered,
      administeredBy: who(v),
    });
  }

  for (const d of deworming) {
    if (d.next_due_date) {
      upcoming.push({
        id: `worm-${d.id}`,
        kind: 'deworming',
        title: d.product_name.trim() ? d.product_name : 'Deworming',
        dueDate: d.next_due_date,
        daysUntil: daysUntil(d.next_due_date, now),
      });
    }
    history.push({
      id: `worm-h-${d.id}`,
      kind: 'deworming',
      title: d.product_name.trim() ? d.product_name : 'Deworming',
      eventDate: d.treatment_date,
      administeredBy: who(d),
    });
  }

  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  history.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  return { upcoming, history };
}

export function upcomingDueLabel(item: HealthCalendarUpcoming): string {
  if (item.daysUntil > 1) return `due in ${item.daysUntil} days`;
  if (item.daysUntil === 1) return 'due tomorrow';
  if (item.daysUntil === 0) return 'due today';
  return `Was due ${formatShortDate(item.dueDate)}`;
}

export function formatShortDate(iso: string): string {
  try {
    return parseISO(iso.slice(0, 10)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}
