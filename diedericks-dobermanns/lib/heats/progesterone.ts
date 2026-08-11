/** Interpret progesterone against ng/mL (convert nmol/L first). */

export type ProgUnit = 'ng_ml' | 'nmol_l';

export const NMOL_PER_NG = 3.18;

export function toNgMl(value: number, unit: ProgUnit): number {
  if (!Number.isFinite(value)) return NaN;
  return unit === 'ng_ml' ? value : Math.round((value / NMOL_PER_NG) * 100) / 100;
}

export function fromNgMl(valueNgMl: number, unit: ProgUnit): number {
  if (!Number.isFinite(valueNgMl)) return NaN;
  return unit === 'ng_ml'
    ? valueNgMl
    : Math.round(valueNgMl * NMOL_PER_NG * 100) / 100;
}

export function formatConversion(value: number, unit: ProgUnit): string | null {
  if (!Number.isFinite(value) || value < 0) return null;
  if (unit === 'nmol_l') {
    return `${value} nmol/L = ${toNgMl(value, 'nmol_l')} ng/mL`;
  }
  return `${value} ng/mL = ${fromNgMl(value, 'nmol_l')} nmol/L`;
}

export function interpretNgMl(valueNgMl: number): string {
  if (valueNgMl < 2) return 'Baseline — too early to breed';
  if (valueNgMl < 5) return 'Approaching — retest in 48 hours';
  if (valueNgMl < 8) return 'LH surge — breed in ~2 days';
  if (valueNgMl <= 12) return 'Ovulation — breed in 2 days';
  return 'Past ovulation — breed now';
}

export function progesteroneColor(valueNgMl: number): string {
  if (valueNgMl > 12) return '#C4A35A';
  if (valueNgMl >= 5) return '#22c55e';
  if (valueNgMl >= 2) return '#eab308';
  return '#8C8474';
}
