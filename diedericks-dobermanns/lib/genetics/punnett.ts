/** Punnett square helpers — pure TypeScript. */

export function crossLocus(parent1: string, parent2: string): Record<string, number> {
  const a1 = parent1.split('');
  const a2 = parent2.split('');
  const results: Record<string, number> = {};
  for (const x of a1) {
    for (const y of a2) {
      const combo = [x, y].sort().join('');
      results[combo] = (results[combo] || 0) + 0.25;
    }
  }
  return results;
}

export function combineProbabilities(
  mapA: Record<string, number>,
  mapB: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ga, pa] of Object.entries(mapA)) {
    for (const [gb, pb] of Object.entries(mapB)) {
      const key = `${ga}/${gb}`;
      out[key] = (out[key] || 0) + pa * pb;
    }
  }
  return out;
}

export function vwdCross(
  p1: 'clear' | 'carrier' | 'affected',
  p2: 'clear' | 'carrier' | 'affected',
): Record<string, number> {
  const toAlleles = (s: string) => {
    if (s === 'clear') return ['N', 'N'];
    if (s === 'carrier') return ['N', 'v'];
    return ['v', 'v'];
  };
  const a1 = toAlleles(p1);
  const a2 = toAlleles(p2);
  const counts: Record<string, number> = { clear: 0, carrier: 0, affected: 0 };
  for (const x of a1) {
    for (const y of a2) {
      const hasV = x === 'v' || y === 'v';
      const bothV = x === 'v' && y === 'v';
      if (bothV) counts.affected += 0.25;
      else if (hasV) counts.carrier += 0.25;
      else counts.clear += 0.25;
    }
  }
  return counts;
}
