import type {
  BreedingPlanStep,
  DerivedStep,
  PlanDogHealth,
  PlanWithSteps,
  StepStatus,
} from '@/lib/breeding/planTypes';

const HELD = new Set<StepStatus>(['skipped', 'blocked']);

function recorded(value: string | null | undefined): boolean {
  return value != null && value !== '' && value !== 'Pending';
}

function hay(step: Pick<BreedingPlanStep, 'title' | 'detail'>): string {
  return `${step.title} ${step.detail ?? ''}`.toLowerCase();
}

export function healthTestRecorded(
  step: Pick<BreedingPlanStep, 'title' | 'detail'>,
  dog: PlanDogHealth,
): boolean {
  const text = hay(step);
  const named =
    text.includes('holter') ||
    text.includes('hip') ||
    text.includes('elbow') ||
    text.includes('dcm') ||
    /\bhd\b/.test(text) ||
    /\bed\b/.test(text);

  if (text.includes('holter')) return recorded(dog.holter_result);
  if (text.includes('hip') || /\bhd\b/.test(text)) return recorded(dog.health_hd);
  if (text.includes('elbow') || /\bed\b/.test(text)) return recorded(dog.health_ed);
  if (text.includes('dcm')) {
    return (
      recorded(dog.health_dcm1) ||
      recorded(dog.health_dcm2) ||
      recorded(dog.health_dcm3) ||
      recorded(dog.health_dcm4) ||
      recorded(dog.health_dcm5)
    );
  }
  if (!named) {
    return (
      recorded(dog.holter_result) ||
      recorded(dog.health_hd) ||
      recorded(dog.health_ed) ||
      recorded(dog.health_dcm1)
    );
  }
  return false;
}

/** Display status. Linked records win unless skipped, blocked, or OVERRIDE:. */
export function deriveStepStatus(step: BreedingPlanStep): StepStatus {
  if (HELD.has(step.status)) return step.status;
  if (step.notes?.startsWith('OVERRIDE:')) return step.status;

  if (step.step_type === 'mating' && step.heat) {
    const whelped = step.litter?.actual_date ?? step.heat.actual_whelp_date;
    if (
      step.heat.mating_date ||
      step.has_mating ||
      step.heat.resulting_litter_id ||
      whelped
    ) {
      return 'done';
    }
    if (
      step.heat.status === 'in_heat' ||
      step.heat.status === 'active' ||
      step.heat.status === 'mated'
    ) {
      return 'in_progress';
    }
    return step.status;
  }

  if (step.step_type === 'whelp') {
    if (step.litter?.actual_date || step.heat?.actual_whelp_date) {
      return 'done';
    }
    return step.status;
  }

  if (step.step_type === 'select_keeper') {
    return step.result_dog_id ? 'done' : step.status;
  }

  if (step.step_type === 'health_test') {
    const dog = step.result_dog ?? step.dam ?? step.sire;
    if (dog && healthTestRecorded(step, dog)) return 'done';
    return step.status;
  }

  return step.status;
}

export function findNextStep<T extends { effectiveStatus: StepStatus; step_order: number }>(
  steps: T[],
): T | null {
  return (
    [...steps]
      .sort((a, b) => a.step_order - b.step_order)
      .find((s) => s.effectiveStatus !== 'done' && s.effectiveStatus !== 'skipped') ?? null
  );
}

export function decorateSteps(steps: BreedingPlanStep[]): DerivedStep[] {
  const withStatus: DerivedStep[] = steps.map((s) => ({
    ...s,
    effectiveStatus: deriveStepStatus(s),
    isNext: false,
  }));
  const next = findNextStep(withStatus);
  return withStatus.map((s) => ({ ...s, isNext: next?.id === s.id }));
}

export function formatExpectedWindow(
  start: string | null,
  end: string | null,
  formatDate: (value: string) => string,
): string | null {
  if (!start && !end) return null;
  if (start && end && start !== end) {
    return `${formatDate(start)} – ${formatDate(end)}`;
  }
  return formatDate((start ?? end)!);
}

export function plansNeedingAttention(plans: PlanWithSteps[]): PlanWithSteps[] {
  return plans.filter((p) => {
    if (p.status !== 'active') return false;
    return p.steps.some(
      (s) => s.effectiveStatus === 'blocked' || s.isNext || s.effectiveStatus === 'ready',
    );
  });
}
