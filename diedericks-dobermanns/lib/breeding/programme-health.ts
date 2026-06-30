import type { BreedingDog, BreedingLine, ProgrammeHealthReport } from '@/types/breeding';
import { COI_WARNING } from '@/lib/breeding/constants';

function countActive(dogs: BreedingDog[], line: BreedingLine, role: 'Sire' | 'Dam'): number {
  return dogs.filter(
    (d) =>
      d.line === line &&
      (d.breeding_role === role || d.breeding_role === 'Both') &&
      d.status !== 'deceased' &&
      d.status !== 'retired',
  ).length;
}

export function checkProgrammeHealth(
  dogs: BreedingDog[],
  options?: { gen2CoiEstimate?: number },
): ProgrammeHealthReport {
  const alerts: string[] = [];

  for (const line of ['A', 'B'] as const) {
    const sires = countActive(dogs, line, 'Sire');
    const dams = countActive(dogs, line, 'Dam');
    if (sires < 1) {
      alerts.push(`Line ${line} has no active sire — succession required`);
    }
    if (dams < 1) {
      alerts.push(`Line ${line} has no active dams`);
    }
  }

  if (options?.gen2CoiEstimate != null && options.gen2CoiEstimate > COI_WARNING) {
    alerts.push(
      `Generation 2 within-line COI estimate ${options.gen2CoiEstimate.toFixed(1)}% — consider a cross pairing`,
    );
  }

  const gen2Active = dogs.some((d) => (d.generation ?? 0) >= 2 && d.breeding_role != null);
  const bothLinesHaveGen1 =
    countActive(dogs, 'A', 'Sire') >= 1 &&
    countActive(dogs, 'B', 'Sire') >= 1 &&
    countActive(dogs, 'A', 'Dam') >= 1 &&
    countActive(dogs, 'B', 'Dam') >= 1;

  if (alerts.some((a) => a.includes('no active'))) {
    return { status: 'at_risk', label: 'At Risk', alerts };
  }

  if (gen2Active && bothLinesHaveGen1 && alerts.length === 0) {
    return { status: 'self_sustaining', label: 'Self-Sustaining', alerts };
  }

  return { status: 'developing', label: 'Developing', alerts };
}

export function programmeStatusEmoji(status: ProgrammeHealthReport['status']): string {
  switch (status) {
    case 'at_risk':
      return '🔴';
    case 'developing':
      return '🟡';
    case 'self_sustaining':
      return '🟢';
  }
}
