/**
 * South Africa / Eswatini phone normalisation to E.164.
 * Never guesses a country code — unknown shapes return null.
 */

export function digitsAndPlus(raw) {
  return String(raw ?? '').trim().replace(/[^\d+]/g, '');
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null} E.164 or null if unresolvable
 */
export function toE164(raw) {
  if (raw == null) return null;
  let s = digitsAndPlus(raw);
  if (!s) return null;

  if (s.startsWith('+')) {
    const rest = s.slice(1).replace(/\D/g, '');
    return rest ? `+${rest}` : null;
  }

  const d = s.replace(/\D/g, '');
  if (!d) return null;

  // 0XXXXXXXXX — SA national (10 digits)
  if (d.length === 10 && d.startsWith('0')) return `+27${d.slice(1)}`;
  // 27XXXXXXXXX — SA without plus (11 digits)
  if (d.length === 11 && d.startsWith('27')) return `+${d}`;
  // 7XXXXXXXX — SA mobile without leading 0 (9 digits)
  if (d.length === 9 && d.startsWith('7')) return `+27${d}`;
  // 268XXXXXXX — Eswatini
  if (d.startsWith('268') && d.length >= 11) return `+${d}`;

  return null;
}

export function normaliseEmail(raw) {
  const e = String(raw ?? '').trim().toLowerCase();
  if (!e || !e.includes('@')) return null;
  return e;
}

/** Lowercase, collapse whitespace, strip punctuation and common accents. */
export function normaliseName(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isPlaceholderName(raw) {
  const n = normaliseName(raw);
  return !n || n === 'unnamed contact';
}

export function namesCompatible(a, b) {
  if (isPlaceholderName(a) || isPlaceholderName(b)) return true;
  return normaliseName(a) === normaliseName(b);
}
