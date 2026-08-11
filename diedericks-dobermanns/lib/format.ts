/** Small presentation helpers. All money values are South African Rand. */

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return 'POA';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Whole weeks of age from a date of birth (calendar days / 7). */
export function ageInWeeks(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const ms = now.getTime() - birth.getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / (7 * 86_400_000));
}

/**
 * Age in human terms: weeks up to six months, then months, then years.
 * Portal dog page and dashboard — matches web `ageFromDob`.
 */
export function ageFromDob(dob: string | null | undefined, now = new Date()): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (months < 0) return null;
  if (months < 6) {
    const weeks = ageInWeeks(dob, now) ?? 0;
    if (weeks < 1) {
      const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));
      return days <= 1 ? '1 day' : `${days} days`;
    }
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} year${years === 1 ? '' : 's'}` : `${years}y ${rem}m`;
}

/** Human-friendly age from a date of birth (portal / public). */
export function formatAge(dateOfBirth: string | null | undefined): string {
  return ageFromDob(dateOfBirth) ?? '—';
}

/** True when month/day match today (Feb 29 → Mar 1 in non-leap years). */
export function isBirthdayToday(dob: string | null | undefined, now = new Date()): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const m = birth.getMonth();
  const d = birth.getDate();
  if (m === 1 && d === 29) {
    const y = now.getFullYear();
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (!leap) return now.getMonth() === 2 && now.getDate() === 1;
  }
  return now.getMonth() === m && now.getDate() === d;
}

const AGE_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty',
];

/** "two" / "1" for the age a dog turns on today's birthday. */
export function birthdayAgeWords(dob: string | null | undefined, now = new Date()): string | null {
  if (!dob || !isBirthdayToday(dob, now)) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years -= 1;
  }
  if (years < 1) return 'one';
  if (years <= 20) return AGE_WORDS[years - 1] ?? String(years);
  return String(years);
}

/** Short date + time for notifications (e.g. "23 Jun · 14:30"). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

/** Turns snake_case / kebab values into Title Case for display. */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
