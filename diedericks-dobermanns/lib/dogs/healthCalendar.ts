import { differenceInCalendarDays, parseISO } from "date-fns";

export type HealthCalendarKind = "vaccination" | "deworming";

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
  treatment_type?: string | null;
  administered_by?: string | null;
  doctor_name?: string | null;
};

export function vaccinationGroupKey(vaccineName: string | null | undefined): string {
  return vaccineName?.trim() || "vaccination";
}

export function dewormingGroupKey(treatmentType: string | null | undefined): string {
  return treatmentType?.trim() || "deworming";
}

/**
 * One due date per group: the row with the latest treatment date.
 * Earlier rows are history — they never produce a due item.
 */
export function latestPerGroup<T>(
  rows: T[],
  groupOf: (row: T) => string,
  dateOf: (row: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = groupOf(row);
    const prev = map.get(key);
    if (!prev || dateOf(row) >= dateOf(prev)) map.set(key, row);
  }
  return [...map.values()];
}

export function daysUntilDue(iso: string, now = new Date()): number {
  try {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return differenceInCalendarDays(parseISO(iso.slice(0, 10)), today);
  } catch {
    return 0;
  }
}

export function dueFlags(
  nextDueDate: string | null | undefined,
  now = new Date(),
): { isOverdue: boolean; isUpcoming: boolean } {
  if (!nextDueDate) return { isOverdue: false, isUpcoming: false };
  const days = daysUntilDue(nextDueDate, now);
  return { isOverdue: days < 0, isUpcoming: days >= 0 };
}

export function healthDueItems<T extends { isOverdue: boolean; isUpcoming: boolean }>(
  entries: T[],
): T[] {
  return entries.filter((e) => e.isUpcoming || e.isOverdue);
}

function who(row: { administered_by?: string | null; doctor_name?: string | null }): string | null {
  const name = row.administered_by?.trim() || row.doctor_name?.trim() || "";
  return name || null;
}

/**
 * What's next + history from vaccinations and deworming `next_due_date`.
 * Only the latest record in each group produces a due date.
 * Overdue items stay in upcoming so the wording can stay calm: "Was due 12 August".
 */
export function buildHealthCalendar(
  vaccinations: VaccinationLike[],
  deworming: DewormingLike[],
  now = new Date(),
): HealthCalendar {
  const upcoming: HealthCalendarUpcoming[] = [];
  const history: HealthCalendarHistory[] = [];

  const latestVax = latestPerGroup(
    vaccinations,
    (v) => vaccinationGroupKey(v.vaccine_name),
    (v) => v.date_administered,
  );
  const latestWorm = latestPerGroup(
    deworming,
    (d) => dewormingGroupKey(d.treatment_type),
    (d) => d.treatment_date,
  );

  for (const v of latestVax) {
    if (!v.next_due_date) continue;
    upcoming.push({
      id: `vax-${v.id}`,
      kind: "vaccination",
      title: v.vaccine_name,
      dueDate: v.next_due_date,
      daysUntil: daysUntilDue(v.next_due_date, now),
    });
  }

  for (const d of latestWorm) {
    if (!d.next_due_date) continue;
    upcoming.push({
      id: `worm-${d.id}`,
      kind: "deworming",
      title: d.product_name.trim() ? d.product_name : "Deworming",
      dueDate: d.next_due_date,
      daysUntil: daysUntilDue(d.next_due_date, now),
    });
  }

  for (const v of vaccinations) {
    history.push({
      id: `vax-h-${v.id}`,
      kind: "vaccination",
      title: v.vaccine_name,
      eventDate: v.date_administered,
      administeredBy: who(v),
    });
  }

  for (const d of deworming) {
    history.push({
      id: `worm-h-${d.id}`,
      kind: "deworming",
      title: d.product_name.trim() ? d.product_name : "Deworming",
      eventDate: d.treatment_date,
      administeredBy: who(d),
    });
  }

  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  history.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return { upcoming, history };
}

export function upcomingDueLabel(
  item: Pick<HealthCalendarUpcoming, "dueDate" | "daysUntil">,
): string {
  if (item.daysUntil > 1) return `due in ${item.daysUntil} days`;
  if (item.daysUntil === 1) return "due tomorrow";
  if (item.daysUntil === 0) return "due today";
  return `Was due ${formatLongDate(item.dueDate)}`;
}

export function dueWording(nextDueDate: string | null | undefined, now = new Date()): string | null {
  if (!nextDueDate) return null;
  return upcomingDueLabel({ dueDate: nextDueDate, daysUntil: daysUntilDue(nextDueDate, now) });
}

export function formatShortDate(iso: string): string {
  try {
    return parseISO(iso.slice(0, 10)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function formatLongDate(iso: string): string {
  try {
    return parseISO(iso.slice(0, 10)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

export function kindLabel(kind: HealthCalendarKind): string {
  return kind === "vaccination" ? "Vaccination" : "Deworming";
}
