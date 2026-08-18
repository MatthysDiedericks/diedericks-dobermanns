import { WHELP_TEMP_DROP_C, type WhelpTempRecord } from './constants';

export const WHELP_TEMP_MIN_C = 33;
export const WHELP_TEMP_MAX_C = 43;
export const WHELP_TEMP_RANGE_MSG =
  'Enter a rectal temperature between 33 and 43 °C.';

/** Same range the table enforces — return a readable message, never the DB error. */
export function validateWhelpTempC(value: number): string | null {
  if (!Number.isFinite(value) || value < WHELP_TEMP_MIN_C || value > WHELP_TEMP_MAX_C) {
    return WHELP_TEMP_RANGE_MSG;
  }
  return null;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Matches WhelpingWatch: latest reading under 37.2 °C, plus that reading and the two before it. */
export function latestDropAndPrevious(temps: WhelpTempRecord[]): {
  latestDrop: WhelpTempRecord | null;
  previousThree: WhelpTempRecord[];
} {
  const drops = [...temps]
    .filter((t) => Number(t.temp_c) < WHELP_TEMP_DROP_C)
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  const latestDrop = drops[0] ?? null;
  if (!latestDrop) return { latestDrop: null, previousThree: [] };
  const previousThree = [...temps]
    .filter((t) => t.taken_at <= latestDrop.taken_at)
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at))
    .slice(0, 3);
  return { latestDrop, previousThree };
}

export function dropAlertMessage(drop: WhelpTempRecord): string {
  return `Temperature dropped to ${Number(drop.temp_c).toFixed(1)} °C at ${timeLabel(drop.taken_at)} — whelping likely within 24 hours.`;
}

export function previousThreeCaption(temps: WhelpTempRecord[]): string {
  if (temps.length === 0) return 'One reading is not proof.';
  return `One reading is not proof. Recent readings: ${temps
    .map((t) => `${Number(t.temp_c).toFixed(1)} °C (${timeLabel(t.taken_at)})`)
    .join(' · ')}`;
}
