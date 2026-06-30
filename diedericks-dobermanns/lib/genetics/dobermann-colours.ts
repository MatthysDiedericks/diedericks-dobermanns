import { crossLocus } from '@/lib/genetics/punnett';

export interface ColourOutcome {
  name: string;
  hex: string;
  probability: number;
  genotype: string;
}

const COLOUR_MAP: Record<string, { name: string; hex: string }> = {
  'BB/DD': { name: 'Black & Rust', hex: '#1a1a1a' },
  'BB/Dd': { name: 'Black & Rust', hex: '#1a1a1a' },
  'Bb/DD': { name: 'Black & Rust', hex: '#1a1a1a' },
  'Bb/Dd': { name: 'Black & Rust', hex: '#1a1a1a' },
  'bb/DD': { name: 'Red/Brown & Rust', hex: '#8B4513' },
  'bb/Dd': { name: 'Red/Brown & Rust', hex: '#8B4513' },
  'BB/dd': { name: 'Blue & Rust', hex: '#6B7280' },
  'Bb/dd': { name: 'Blue & Rust', hex: '#6B7280' },
  'bb/dd': { name: 'Fawn & Rust', hex: '#D2691E' },
};

export function calculateOffspringColours(
  bParent1: string,
  bParent2: string,
  dParent1: string,
  dParent2: string,
): ColourOutcome[] {
  const bCross = crossLocus(bParent1, bParent2);
  const dCross = crossLocus(dParent1, dParent2);
  const merged: Record<string, number> = {};

  for (const [bg, bp] of Object.entries(bCross)) {
    for (const [dg, dp] of Object.entries(dCross)) {
      const key = `${bg}/${dg}`;
      const meta = COLOUR_MAP[key];
      const label = meta?.name ?? key;
      merged[label] = (merged[label] || 0) + bp * dp;
    }
  }

  return Object.entries(merged)
    .map(([name, probability]) => {
      const entry = Object.values(COLOUR_MAP).find((c) => c.name === name);
      return {
        name,
        hex: entry?.hex ?? '#888888',
        probability,
        genotype: name,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}
