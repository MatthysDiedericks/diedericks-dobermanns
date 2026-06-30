/**
 * Wright's Coefficient of Inbreeding (COI) — path coefficient method.
 * Thresholds tuned for Diedericks Dobermanns (5% internal limit).
 */

export type AncestorEntry = {
  ancestor_id: string;
  depth: number;
  path: string;
};

export type CoiSeverity = 'excellent' | 'acceptable' | 'caution' | 'risk' | 'high_risk';

export type CoiResult = {
  coi: number;
  severity: CoiSeverity;
  common_ancestors: string[];
  explanation: string;
};

export function calculateCoi(
  sireAncestors: AncestorEntry[],
  damAncestors: AncestorEntry[],
): CoiResult {
  const sireIds = new Map<string, number[]>();
  const damIds = new Map<string, number[]>();

  for (const a of sireAncestors) {
    if (!sireIds.has(a.ancestor_id)) sireIds.set(a.ancestor_id, []);
    sireIds.get(a.ancestor_id)!.push(a.depth);
  }
  for (const a of damAncestors) {
    if (!damIds.has(a.ancestor_id)) damIds.set(a.ancestor_id, []);
    damIds.get(a.ancestor_id)!.push(a.depth);
  }

  const commonAncestors = [...sireIds.keys()].filter((id) => damIds.has(id));

  let f = 0;
  for (const ancestorId of commonAncestors) {
    const sirePaths = sireIds.get(ancestorId)!;
    const damPaths = damIds.get(ancestorId)!;
    for (const n of sirePaths) {
      for (const m of damPaths) {
        f += 0.5 ** (n + m + 1);
      }
    }
  }

  const coiPercent = Math.round(f * 10000) / 100;

  let severity: CoiSeverity;
  let explanation: string;

  if (coiPercent < 3) {
    severity = 'excellent';
    explanation = `COI of ${coiPercent}% — excellent. Low genetic overlap. Healthy genetic diversity expected.`;
  } else if (coiPercent < 5) {
    severity = 'acceptable';
    explanation = `COI of ${coiPercent}% — acceptable linebreeding. Monitor retained pups for Holter at 24 months.`;
  } else if (coiPercent < 6.25) {
    severity = 'caution';
    explanation = `COI of ${coiPercent}% — approaching our 5% threshold. Consider a cross pairing with the opposite line before proceeding.`;
  } else if (coiPercent < 12.5) {
    severity = 'risk';
    explanation = `COI of ${coiPercent}% — RISK. Equivalent to half-sibling mating. Cross to the other line. Do not proceed without veterinary genetics review.`;
  } else {
    severity = 'high_risk';
    explanation = `COI of ${coiPercent}% — HIGH RISK. This pairing should not proceed. Seek outcross immediately.`;
  }

  return { coi: coiPercent, severity, common_ancestors: commonAncestors, explanation };
}

export function coiColour(severity: CoiSeverity): string {
  switch (severity) {
    case 'excellent':
      return '#22C55E';
    case 'acceptable':
      return '#84CC16';
    case 'caution':
      return '#F59E0B';
    case 'risk':
      return '#EF4444';
    case 'high_risk':
      return '#7F1D1D';
  }
}

/** Planner line colours: green < 3% | amber 3–5% | red > 5% */
export function plannerLineColour(coi: number): string {
  if (coi < 3) return '#22C55E';
  if (coi <= 5) return '#F59E0B';
  return '#EF4444';
}

export function severityFromCoi(coi: number): CoiSeverity {
  if (coi < 3) return 'excellent';
  if (coi < 5) return 'acceptable';
  if (coi < 6.25) return 'caution';
  if (coi < 12.5) return 'risk';
  return 'high_risk';
}
