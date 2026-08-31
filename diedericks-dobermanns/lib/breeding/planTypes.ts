import { PROFILE_PHOTO_EMBED } from '@/lib/dogs/profilePhoto';

export const PLAN_STATUSES = ['active', 'paused', 'completed', 'abandoned'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const STEP_TYPES = [
  'mating',
  'whelp',
  'select_keeper',
  'raise',
  'train',
  'health_test',
  'breed_next',
  'retire',
  'other',
] as const;
export type StepType = (typeof STEP_TYPES)[number];

export const STEP_STATUSES = [
  'planned',
  'ready',
  'in_progress',
  'done',
  'blocked',
  'skipped',
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

/** Plain-English labels. No jargon on the tracker. */
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  abandoned: 'Abandoned',
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  mating: 'Mating',
  whelp: 'Whelp',
  select_keeper: 'Choose keeper',
  raise: 'Raise',
  train: 'Train',
  health_test: 'Health test',
  breed_next: 'Breed next',
  retire: 'Retire',
  other: 'Other',
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  planned: 'Planned',
  ready: 'Ready',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
  skipped: 'Skipped',
};

export const PLAN_DOG_EMBED =
  `id, name, sex, holter_result, health_hd, health_ed, ` +
  `health_dcm1, health_dcm2, health_dcm3, health_dcm4, health_dcm5, ` +
  `dog_media!dog_media_dog_id_fkey(${PROFILE_PHOTO_EMBED})`;

export type PlanDogHealth = {
  holter_result: string | null;
  health_hd: string | null;
  health_ed: string | null;
  health_dcm1: string | null;
  health_dcm2: string | null;
  health_dcm3: string | null;
  health_dcm4: string | null;
  health_dcm5: string | null;
};

export type PlanDog = PlanDogHealth & {
  id: string;
  name: string;
  sex: string | null;
  photoUrl: string | null;
};

export type PlanHeatLink = {
  id: string;
  mating_date: string | null;
  status: string;
  actual_whelp_date: string | null;
  resulting_litter_id: string | null;
};

export type PlanLitterLink = {
  id: string;
  actual_date: string | null;
};

export type BreedingPlan = {
  id: string;
  name: string;
  objective: string;
  status: PlanStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BreedingPlanStep = {
  id: string;
  plan_id: string;
  step_order: number;
  title: string;
  detail: string | null;
  step_type: StepType;
  status: StepStatus;
  dam_id: string | null;
  sire_id: string | null;
  litter_id: string | null;
  heat_cycle_id: string | null;
  result_dog_id: string | null;
  expected_start: string | null;
  expected_end: string | null;
  actual_at: string | null;
  blocked_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  dam: PlanDog | null;
  sire: PlanDog | null;
  result_dog: PlanDog | null;
  heat: PlanHeatLink | null;
  litter: PlanLitterLink | null;
  has_mating: boolean;
};

export type DerivedStep = BreedingPlanStep & {
  effectiveStatus: StepStatus;
  isNext: boolean;
};

export type PlanWithSteps = BreedingPlan & { steps: DerivedStep[] };

export type PlanNextRow = {
  plan: BreedingPlan;
  next: DerivedStep | null;
  blocked: DerivedStep[];
};

export type StepWrite = {
  title: string;
  detail?: string | null;
  step_type: StepType;
  status: StepStatus;
  dam_id?: string | null;
  sire_id?: string | null;
  litter_id?: string | null;
  heat_cycle_id?: string | null;
  result_dog_id?: string | null;
  expected_start?: string | null;
  expected_end?: string | null;
  actual_at?: string | null;
  blocked_reason?: string | null;
  notes?: string | null;
};

export function isPlanStatus(value: string): value is PlanStatus {
  return (PLAN_STATUSES as readonly string[]).includes(value);
}

export function isStepType(value: string): value is StepType {
  return (STEP_TYPES as readonly string[]).includes(value);
}

export function isStepStatus(value: string): value is StepStatus {
  return (STEP_STATUSES as readonly string[]).includes(value);
}
