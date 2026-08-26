export const PROGRAMME_TIER_KEYS = ['puppy', 'elite_developed', 'protection_dog'] as const;

export type ProgrammeTierKey = (typeof PROGRAMME_TIER_KEYS)[number];

export const PROGRAMME_TIER_LABELS: Record<ProgrammeTierKey, string> = {
  puppy: 'Standard puppy',
  elite_developed: 'Elite developed',
  protection_dog: 'Family protection dog',
};

export const PROGRAMME_TIER_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'puppy', label: PROGRAMME_TIER_LABELS.puppy },
  { value: 'elite_developed', label: PROGRAMME_TIER_LABELS.elite_developed },
  { value: 'protection_dog', label: PROGRAMME_TIER_LABELS.protection_dog },
];

export function isProgrammeTierKey(value: string | null | undefined): value is ProgrammeTierKey {
  return Boolean(value && (PROGRAMME_TIER_KEYS as readonly string[]).includes(value));
}

/** Quiet display. Unset is normal — never an error. */
export function programmeTierLabel(
  tier: string | null | undefined,
  unset: string | null = 'Not set',
): string | null {
  if (!tier) return unset;
  return PROGRAMME_TIER_LABELS[tier as ProgrammeTierKey] ?? unset;
}

export function matchesProgrammeFilter(
  tier: string | null | undefined,
  filter: string,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'unset') return !tier;
  return tier === filter;
}
