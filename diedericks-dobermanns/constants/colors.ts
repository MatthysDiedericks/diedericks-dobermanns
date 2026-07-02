/**
 * Brand colour palette — the single typed source of truth.
 * Mirrors the Tailwind theme in `tailwind.config.js`. Use NativeWind classes
 * in components; use these constants only where a raw colour value is required
 * (e.g. navigation theming, status bar, native props that don't accept classes).
 */
export const Colors = {
  background: '#111008',
  surface: '#1C1A0E',
  surfaceElevated: '#252218',
  gold: '#C4A35A',
  goldLight: '#D4B472',
  goldDim: '#8A7240',
  text: '#F5F0E8',
  textMuted: '#9E9880',
  textSubtle: '#5C5746',
  border: '#2E2B1E',
  borderGold: '#C4A35A33',
  error: '#C0392B',
  success: '#27AE60',
  // Legacy aliases (existing components)
  black: '#0A0A0A',
  blackRich: '#111008',
  nav: '#1C1A0E',
  goldMuted: '#8A7240',
  silver: '#9E9880',
  white: '#F5F0E8',
  offWhite: '#9E9880',
  danger: '#C0392B',
} as const;

export type ColorName = keyof typeof Colors;

/** Lowercase alias for heritage theme token imports. */
export const colors = Colors;
