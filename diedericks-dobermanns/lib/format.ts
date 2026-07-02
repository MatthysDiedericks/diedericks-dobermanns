/** Small presentation helpers. All money values are South African Rand. */

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return 'POA';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Human-friendly age from a date of birth (e.g. "2 yrs", "10 wks"). */
export function formatAge(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const days = Math.floor((now.getTime() - dob.getTime()) / 86_400_000);
  if (days < 0) return 'Unborn';
  if (days < 7) return `${days} d`;
  if (days < 84) return `${Math.floor(days / 7)} wks`;
  const years = now.getFullYear() - dob.getFullYear();
  const months =
    years * 12 + (now.getMonth() - dob.getMonth()) - (now.getDate() < dob.getDate() ? 1 : 0);
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yrs`;
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
