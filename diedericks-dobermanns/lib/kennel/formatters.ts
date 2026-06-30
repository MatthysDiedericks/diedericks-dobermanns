import { differenceInDays, format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatKennelDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

/** Puppy age from whelp date: "3w 1d" */
export function formatPuppyAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  try {
    const days = differenceInDays(new Date(), parseISO(birthDate));
    if (days < 0) return 'Unborn';
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks === 0) return `${days}d`;
    return rem > 0 ? `${weeks}w ${rem}d` : `${weeks}w`;
  } catch {
    return '—';
  }
}

/** Dog age from DOB: "3y 1m" */
export function formatDogAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  try {
    const birth = parseISO(dob);
    const now = new Date();
    let months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 12) return `${months}m`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
  } catch {
    return '—';
  }
}

export function timeAgo(value: string): string {
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function daysInHeat(heatStart: string): number {
  try {
    return differenceInDays(new Date(), parseISO(heatStart));
  } catch {
    return 0;
  }
}

export function daysSinceOvulation(ovulationDate: string | null): number | null {
  if (!ovulationDate) return null;
  try {
    return differenceInDays(new Date(), parseISO(ovulationDate));
  } catch {
    return null;
  }
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  try {
    return parseISO(dueDate) < new Date(new Date().toDateString());
  } catch {
    return false;
  }
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  try {
    const d = parseISO(dueDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function litterLabel(
  litterLetter: string | null | undefined,
  damName?: string | null,
): string {
  const letter = litterLetter ? `Litter ${litterLetter}` : 'Litter';
  return damName ? `🐾 ${damName}: ${letter}` : `🐾 ${letter}`;
}

/** Formats decimal kg for display — e.g. 1.129 → "1 kg 129 g". */
export function formatWeight(kg: number): string {
  const wholeKg = Math.floor(kg);
  const grams = Math.round((kg - wholeKg) * 1000);
  if (wholeKg === 0) return `${grams} g`;
  if (grams === 0) return `${wholeKg} kg`;
  return `${wholeKg} kg ${grams} g`;
}
