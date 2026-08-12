/**
 * Canonical Dobermann colour vocabulary — shared across dogs, applications,
 * and waiting-list preferences. Never hard-code colour labels in components.
 *
 * FCI breed standard calls the marking "rust"; black_rust / red_rust were the
 * previous internal terms for the same two colours.
 */

export const DOG_COLOURS = ['black_tan', 'brown_tan'] as const;
export type DogColourCode = (typeof DOG_COLOURS)[number];

export const PREFERENCE_COLOURS = ['black_tan', 'brown_tan', 'no_preference'] as const;
export type PreferenceColourCode = (typeof PREFERENCE_COLOURS)[number];

export const COLOUR_LABELS: Record<DogColourCode | PreferenceColourCode, string> = {
  black_tan: 'Black & Tan',
  brown_tan: 'Brown & Tan',
  no_preference: 'No preference',
};

export const COLOUR_HEX: Record<DogColourCode, string> = {
  black_tan: '#1a1a1a',
  brown_tan: '#8B4513',
};

export function colourLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return COLOUR_LABELS[code as PreferenceColourCode] ?? code.replace(/_/g, ' ');
}

export const DOG_COLOUR_OPTIONS = DOG_COLOURS.map((value) => ({
  value,
  label: COLOUR_LABELS[value],
}));

export const PREFERENCE_COLOUR_OPTIONS = PREFERENCE_COLOURS.map((value) => ({
  value,
  label: COLOUR_LABELS[value],
}));
