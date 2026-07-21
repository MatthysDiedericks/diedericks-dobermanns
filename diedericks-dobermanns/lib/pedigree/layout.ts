/** Row index within a generation column (S=0, D=1 binary path). */
export function positionToRowIndex(position: string): number {
  if (!position) return 0;
  const bits = position.replace(/S/g, '0').replace(/D/g, '1');
  return parseInt(bits, 2);
}

export function generationFromPosition(position: string): number {
  return position.length;
}

export function maxPedigreeGeneration(positions: string[]): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions.map((p) => p.length));
}

/** Vertical span for a node at `generation` when the tree has `maxGen` ancestor generations. */
export function pedigreeRowSpan(generation: number, maxGen: number): number {
  if (maxGen <= 0 || generation <= 0) return 1;
  return 2 ** (maxGen - generation);
}

export function isSireSide(position: string): boolean {
  return position.startsWith('S') || position === 'S';
}
