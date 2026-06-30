/**
 * Brand colour palette — the single typed source of truth.
 * Mirrors the Tailwind theme in `tailwind.config.js`. Use NativeWind classes
 * in components; use these constants only where a raw colour value is required
 * (e.g. navigation theming, status bar, native props that don't accept classes).
 */
export const Colors = {
  black: '#0A0A0A', // Deep Black — primary background
  blackRich: '#111008', // Warm Dark — card backgrounds
  nav: '#1C1A0E', // Deep Olive / Dark Gold — navigation bars
  surface: '#1A1A1A', // Dark Grey — secondary backgrounds, inputs
  gold: '#C4A35A', // Gold Primary — warm, muted; CTAs, highlights, active states
  goldLight: '#D8BC82', // Gold Light — hover / secondary gold
  goldMuted: '#8A7A4E', // Muted Gold — inactive nav text/icons
  silver: '#9E9E9E', // Subtext, borders, inactive icons
  white: '#F5F5F5', // Primary text
  offWhite: '#CCCCCC', // Secondary text
  danger: '#C0392B', // Errors, warnings
  success: '#27AE60', // Confirmations
} as const;

export type ColorName = keyof typeof Colors;
