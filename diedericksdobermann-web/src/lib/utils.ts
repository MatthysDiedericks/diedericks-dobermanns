import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** Joins class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Formats an ISO date string for display, e.g. "12 Aug 2026". */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return "—";
  }
}

/** Relative time, e.g. "3 days ago". */
export function timeAgo(value: string | null | undefined) {
  if (!value) return "";
  try {
    return `${formatDistanceToNowStrict(parseISO(value))} ago`;
  } catch {
    return "";
  }
}

/** Formats a numeric price as ZAR currency. Returns null when no price. */
export function formatPrice(
  value: number | null | undefined,
  currency = "ZAR",
) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Title-cases a snake/kebab string for labels. */
export function humanize(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Age in human terms from a date of birth. */
export function ageFromDob(dob: string | null | undefined) {
  if (!dob) return null;
  try {
    const birth = parseISO(dob);
    const now = new Date();
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    if (months < 1) return "Under 1 month";
    if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem === 0
      ? `${years} year${years === 1 ? "" : "s"}`
      : `${years}y ${rem}m`;
  } catch {
    return null;
  }
}
