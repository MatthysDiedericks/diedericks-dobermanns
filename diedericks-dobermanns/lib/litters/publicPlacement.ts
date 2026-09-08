/**
 * How a public litter should be presented. Derived from flags and statuses —
 * never from a hard-coded litter id — so the showcase can change in admin.
 */

export type PublicLitterKind = 'upcoming' | 'available' | 'placed';

const OPEN_PUPPY_STATUSES = new Set(['available', 'reserved', 'in_training', 'puppy']);

export function isPublicDeceasedPuppy(
  status: string | null | undefined,
  deceasedAt?: string | null,
): boolean {
  if (deceasedAt) return true;
  return (status ?? '').toLowerCase() === 'deceased';
}

export function publicLitterKind(
  litter: {
    status?: string | null;
    actual_date?: string | null;
    available_count?: number | null;
    puppy_count?: number | null;
  },
  puppies?: { status: string | null }[],
): PublicLitterKind {
  const status = (litter.status ?? '').toLowerCase();
  if (status === 'planned' || status === 'expected') return 'upcoming';
  if (status === 'placed') return 'placed';

  if (puppies && puppies.length > 0) {
    const living = puppies.filter((p) => !isPublicDeceasedPuppy(p.status));
    if (living.length === 0) return 'placed';
    const anyOpen = living.some((p) => OPEN_PUPPY_STATUSES.has((p.status ?? '').toLowerCase()));
    return anyOpen ? 'available' : 'placed';
  }

  const born = Boolean(litter.actual_date) || status === 'born';
  const pups = litter.puppy_count ?? 0;
  const available = litter.available_count ?? 0;
  if (born && pups > 0 && available === 0) return 'placed';
  if (born && available > 0) return 'available';
  return 'upcoming';
}
