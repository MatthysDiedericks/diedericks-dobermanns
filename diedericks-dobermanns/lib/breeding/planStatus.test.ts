/**
 * Run: npx tsx lib/breeding/planStatus.test.ts
 */
import assert from 'node:assert/strict';

import { decorateSteps, deriveStepStatus, findNextStep } from './planStatus';
import type { BreedingPlanStep, PlanDog, PlanHeatLink } from './planTypes';

function dog(partial: Partial<PlanDog> & { id: string; name: string }): PlanDog {
  return {
    sex: 'female',
    holter_result: null,
    health_hd: null,
    health_ed: null,
    health_dcm1: null,
    health_dcm2: null,
    health_dcm3: null,
    health_dcm4: null,
    health_dcm5: null,
    photoUrl: null,
    ...partial,
  };
}

function step(partial: Partial<BreedingPlanStep>): BreedingPlanStep {
  return {
    id: 's1',
    plan_id: 'p1',
    step_order: 1,
    title: 'Carry out artificial insemination of Cleopatra to Dharka.',
    detail: null,
    step_type: 'mating',
    status: 'planned',
    dam_id: 'cleo',
    sire_id: 'dharka',
    litter_id: null,
    heat_cycle_id: 'heat1',
    result_dog_id: null,
    expected_start: null,
    expected_end: null,
    actual_at: null,
    blocked_reason: null,
    notes: null,
    created_at: '',
    updated_at: '',
    dam: dog({ id: 'cleo', name: 'Cleopatra' }),
    sire: dog({ id: 'dharka', name: 'Dharka', sex: 'male' }),
    result_dog: null,
    heat: null,
    litter: null,
    has_mating: false,
    ...partial,
  };
}

const inHeat: PlanHeatLink = {
  id: 'heat1',
  mating_date: null,
  status: 'in_heat',
  actual_whelp_date: null,
  resulting_litter_id: null,
};

assert.equal(deriveStepStatus(step({ heat: inHeat })), 'in_progress');

const afterMating = step({
  heat: { ...inHeat, mating_date: '2026-09-06', status: 'mated' },
  has_mating: true,
});
assert.equal(deriveStepStatus(afterMating), 'done');

const blocked = step({ status: 'blocked', blocked_reason: 'Waiting on progesterone', heat: inHeat });
assert.equal(deriveStepStatus(blocked), 'blocked');

const overridden = step({
  status: 'planned',
  notes: 'OVERRIDE: still counting this as planned',
  heat: { ...inHeat, mating_date: '2026-09-06' },
  has_mating: true,
});
assert.equal(deriveStepStatus(overridden), 'planned');

assert.equal(
  deriveStepStatus(
    step({
      step_type: 'whelp',
      title: 'Whelp Cleopatra’s litter, expected around 7 November 2026.',
      heat: inHeat,
      litter: { id: 'lit1', actual_date: '2026-11-07' },
    }),
  ),
  'done',
);

assert.equal(
  deriveStepStatus(step({ step_type: 'select_keeper', result_dog_id: 'pup1' })),
  'done',
);

assert.equal(
  deriveStepStatus(
    step({
      step_type: 'health_test',
      title: 'Record a Holter result for the keep-back male.',
      result_dog: dog({ id: 'pup1', name: 'Keeper', holter_result: 'Normal' }),
    }),
  ),
  'done',
);

const decorated = decorateSteps([
  step({ id: 'a', step_order: 1, status: 'done', heat: null, step_type: 'other' }),
  step({ id: 'b', step_order: 2, status: 'in_progress', heat: inHeat }),
  step({ id: 'c', step_order: 3, status: 'planned', heat: null, step_type: 'whelp' }),
]);
assert.equal(decorated.find((s) => s.isNext)?.id, 'b');
assert.equal(findNextStep(decorated)?.id, 'b');

const skippedMiddle = decorateSteps([
  step({ id: 'a', step_order: 1, status: 'done', heat: null, step_type: 'other' }),
  step({ id: 'b', step_order: 2, status: 'skipped', heat: null, step_type: 'other' }),
  step({ id: 'c', step_order: 3, status: 'planned', heat: null, step_type: 'whelp' }),
]);
assert.equal(skippedMiddle.find((s) => s.isNext)?.id, 'c');

console.log('planStatus.test.ts ok');
