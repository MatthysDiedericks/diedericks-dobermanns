/**
 * Live age the way DogBreederPro shows it: "9 weeks 3 days" for a puppy,
 * "3 years 4 months" for an adult. Distinct from ageFromDob, which is shorter.
 */
export function liveAgeFromDob(
  dob: string | null | undefined,
  now = new Date(),
): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const ms = now.getTime() - birth.getTime();
  if (ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);

  if (months < 12) {
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    if (weeks < 1) return days <= 1 ? "1 day" : `${days} days`;
    const weekPart = weeks === 1 ? "1 week" : `${weeks} weeks`;
    if (remDays === 0) return weekPart;
    const dayPart = remDays === 1 ? "1 day" : `${remDays} days`;
    return `${weekPart} ${dayPart}`;
  }

  const years = Math.floor(months / 12);
  const rem = months % 12;
  const yearPart = years === 1 ? "1 year" : `${years} years`;
  if (rem === 0) return yearPart;
  const monthPart = rem === 1 ? "1 month" : `${rem} months`;
  return `${yearPart} ${monthPart}`;
}
