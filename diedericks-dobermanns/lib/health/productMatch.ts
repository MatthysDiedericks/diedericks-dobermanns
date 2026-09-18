function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

/**
 * Offer the kennel's existing spelling when the typed name is a near miss.
 * Exact matches (any case) return null — the name is already right.
 */
export function suggestProductSpelling(
  typed: string,
  products: readonly string[],
): string | null {
  const needle = typed.trim();
  if (needle.length < 4) return null;
  const lower = needle.toLowerCase();
  if (products.some((name) => name.toLowerCase() === lower)) return null;

  let best: { name: string; dist: number } | null = null;
  for (const name of products) {
    const dist = levenshtein(lower, name.toLowerCase());
    if (dist === 0 || dist > 2) continue;
    if (dist === 2 && Math.max(lower.length, name.length) < 6) continue;
    if (!best || dist < best.dist || (dist === best.dist && name.length < best.name.length)) {
      best = { name, dist };
    }
  }
  return best?.name ?? null;
}
