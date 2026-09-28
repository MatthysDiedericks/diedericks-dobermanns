/**
 * Shortlist sold dogs for a human to link. Ranking uses dates and litters.
 * There is no buyer-name field on purpose.
 */

export type CandidateDog = {
  id: string;
  name: string;
  status: string;
  dateOfBirth: string | null;
  placementDate: string | null;
  handoverDate: string | null;
  deliveredAt: string | null;
  litterId: string | null;
  litterName: string | null;
  litterWhelp: string | null;
  linked: boolean;
};

function day(value: string | null | undefined): string | null {
  if (!value) return null;
  const sliced = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(sliced) ? sliced : null;
}

export function candidateReferenceDate(dog: CandidateDog): string | null {
  return (
    day(dog.placementDate) ||
    day(dog.handoverDate) ||
    day(dog.deliveredAt) ||
    day(dog.dateOfBirth)
  );
}

function daysApart(a: string, b: string): number | null {
  const left = Date.parse(`${a}T00:00:00Z`);
  const right = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(left) || Number.isNaN(right)) return null;
  return Math.round((left - right) / 86400000);
}

/** A litter with no whelp date is not hidden. A litter whelped after the sale is. */
export function litterExistedBy(dog: CandidateDog, incomeDate: string): boolean {
  const whelp = day(dog.litterWhelp);
  const income = day(incomeDate);
  if (!whelp || !income) return true;
  return whelp <= income;
}

export function shortlistSaleCandidates(
  incomeDate: string,
  dogs: CandidateDog[],
  limit = 8,
): CandidateDog[] {
  const income = day(incomeDate);
  const ranked = dogs.filter((dog) => dog.status === "sold" && litterExistedBy(dog, incomeDate));
  ranked.sort((a, b) => {
    if (a.linked !== b.linked) return a.linked ? 1 : -1;
    const aDate = candidateReferenceDate(a);
    const bDate = candidateReferenceDate(b);
    const aDays = income && aDate ? Math.abs(daysApart(income, aDate) ?? 99999) : 99999;
    const bDays = income && bDate ? Math.abs(daysApart(income, bDate) ?? 99999) : 99999;
    if (aDays !== bDays) return aDays - bDays;
    return a.name.localeCompare(b.name);
  });
  return ranked.slice(0, limit);
}
