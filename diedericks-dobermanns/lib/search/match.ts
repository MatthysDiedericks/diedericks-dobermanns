/** Shared list-search matching. Phone, text, and document-number rules. */

export const SERVER_SEARCH_MIN_CHARS = 2;

/** Digits only, SA +27 / 0027 folded to a leading 0. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0027') && digits.length >= 13) return `0${digits.slice(4)}`;
  if (digits.startsWith('27') && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

export function looksLikePhoneQuery(query: string): boolean {
  const t = query.trim();
  if (t.length < 2) return false;
  return /^[+\d][\d\s\-().]*$/.test(t);
}

export function phonesMatch(
  query: string,
  ...phones: Array<string | null | undefined>
): boolean {
  const q = normalizePhone(query);
  if (q.length < 2) return false;
  return phones.some((p) => {
    if (!p) return false;
    const n = normalizePhone(p);
    if (!n) return false;
    return n.includes(q) || q.includes(n);
  });
}

export function textIncludes(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}

/** DD-1147, dd1147 and 1147 all match the same number. */
export function normalizeDocNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function documentNumberMatches(
  query: string,
  number: string | null | undefined,
): boolean {
  if (!number) return false;
  const q = normalizeDocNumber(query);
  if (!q) return false;
  return normalizeDocNumber(number).includes(q);
}

export function rowMatches(
  query: string,
  opts: {
    text?: Array<string | null | undefined>;
    phones?: Array<string | null | undefined>;
    numbers?: Array<string | null | undefined>;
  },
): boolean {
  const q = query.trim();
  if (!q) return true;
  if (opts.text && textIncludes(q, ...opts.text)) return true;
  if (opts.phones && phonesMatch(q, ...opts.phones)) return true;
  if (opts.numbers?.some((n) => documentNumberMatches(q, n))) return true;
  return false;
}
