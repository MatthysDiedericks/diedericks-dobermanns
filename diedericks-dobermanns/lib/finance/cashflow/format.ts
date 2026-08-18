/** ZAR: R1 234,56 — space thousands, comma decimal, no space after R. */

export function formatZar(value: number | null | undefined): string {
  const n = Number(value) || 0;
  const neg = n < 0;
  const [whole, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${neg ? "-" : ""}R${grouped},${frac}`;
}

export function monthKey(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const d = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const idx = Number(m) - 1;
  return `${names[idx] ?? m} ${y}`;
}

export function addMonthsKey(key: string, delta: number): string {
  const [ys, ms] = key.split("-");
  const date = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function horizonKeys(fromKey: string, months: number): string[] {
  return Array.from({ length: months }, (_, i) => addMonthsKey(fromKey, i));
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
