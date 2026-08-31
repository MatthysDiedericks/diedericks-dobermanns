import { decorateSteps } from '@/lib/breeding/planStatus';
import {
  PLAN_DOG_EMBED,
  isPlanStatus,
  isStepStatus,
  isStepType,
  type BreedingPlan,
  type BreedingPlanStep,
  type PlanDog,
  type PlanHeatLink,
  type PlanLitterLink,
  type PlanNextRow,
  type PlanWithSteps,
} from '@/lib/breeding/planTypes';
import { profilePhotoUrl, type ProfilePhotoInput } from '@/lib/dogs/profilePhoto';
import { requireSupabase } from '@/lib/supabase';

const STEP_SELECT =
  `id, plan_id, step_order, title, detail, step_type, status, ` +
  `dam_id, sire_id, litter_id, heat_cycle_id, result_dog_id, ` +
  `expected_start, expected_end, actual_at, blocked_reason, notes, ` +
  `created_at, updated_at, ` +
  `dam:dogs!breeding_plan_steps_dam_id_fkey(${PLAN_DOG_EMBED}), ` +
  `sire:dogs!breeding_plan_steps_sire_id_fkey(${PLAN_DOG_EMBED}), ` +
  `result_dog:dogs!breeding_plan_steps_result_dog_id_fkey(${PLAN_DOG_EMBED}), ` +
  `heat:heat_cycles!breeding_plan_steps_heat_cycle_id_fkey(` +
  `id, mating_date, status, actual_whelp_date, resulting_litter_id), ` +
  `litter:litters!breeding_plan_steps_litter_id_fkey(id, actual_date)`;

type RawDog = PlanDog & { dog_media?: ProfilePhotoInput[] | null };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapDog(raw: unknown): PlanDog | null {
  const row = one(raw as RawDog | RawDog[] | null);
  if (!row?.id) return null;
  return {
    id: row.id,
    name: row.name,
    sex: row.sex,
    holter_result: row.holter_result ?? null,
    health_hd: row.health_hd ?? null,
    health_ed: row.health_ed ?? null,
    health_dcm1: row.health_dcm1 ?? null,
    health_dcm2: row.health_dcm2 ?? null,
    health_dcm3: row.health_dcm3 ?? null,
    health_dcm4: row.health_dcm4 ?? null,
    health_dcm5: row.health_dcm5 ?? null,
    photoUrl: profilePhotoUrl(row.dog_media),
  };
}

function mapStep(row: Record<string, unknown>): BreedingPlanStep {
  const heat = one(row.heat as PlanHeatLink | PlanHeatLink[] | null);
  return {
    id: String(row.id),
    plan_id: String(row.plan_id),
    step_order: Number(row.step_order),
    title: String(row.title),
    detail: (row.detail as string | null) ?? null,
    step_type: isStepType(String(row.step_type)) ? (row.step_type as BreedingPlanStep['step_type']) : 'other',
    status: isStepStatus(String(row.status)) ? (row.status as BreedingPlanStep['status']) : 'planned',
    dam_id: (row.dam_id as string | null) ?? null,
    sire_id: (row.sire_id as string | null) ?? null,
    litter_id: (row.litter_id as string | null) ?? null,
    heat_cycle_id: (row.heat_cycle_id as string | null) ?? null,
    result_dog_id: (row.result_dog_id as string | null) ?? null,
    expected_start: (row.expected_start as string | null) ?? null,
    expected_end: (row.expected_end as string | null) ?? null,
    actual_at: (row.actual_at as string | null) ?? null,
    blocked_reason: (row.blocked_reason as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    dam: mapDog(row.dam),
    sire: mapDog(row.sire),
    result_dog: mapDog(row.result_dog),
    heat,
    litter: one(row.litter as PlanLitterLink | PlanLitterLink[] | null),
    has_mating: Boolean(heat?.mating_date),
  };
}

function mapPlan(row: Record<string, unknown>): BreedingPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    objective: String(row.objective),
    status: isPlanStatus(String(row.status)) ? (row.status as BreedingPlan['status']) : 'active',
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function loadSteps(planIds: string[]): Promise<BreedingPlanStep[]> {
  if (planIds.length === 0) return [];
  const { data, error } = await requireSupabase()
    .from('breeding_plan_steps')
    .select(STEP_SELECT)
    .in('plan_id', planIds)
    .order('step_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapStep(row as unknown as Record<string, unknown>));
}

export async function fetchBreedingPlans(): Promise<PlanWithSteps[]> {
  const { data, error } = await requireSupabase()
    .from('breeding_plans')
    .select('id, name, objective, status, created_by, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const plans = (data ?? []).map((row) => mapPlan(row as unknown as Record<string, unknown>));
  const steps = await loadSteps(plans.map((p) => p.id));
  return plans.map((plan) => ({
    ...plan,
    steps: decorateSteps(steps.filter((s) => s.plan_id === plan.id)),
  }));
}

export async function fetchBreedingPlan(id: string): Promise<PlanWithSteps | null> {
  const { data, error } = await requireSupabase()
    .from('breeding_plans')
    .select('id, name, objective, status, created_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const plan = mapPlan(data as unknown as Record<string, unknown>);
  const steps = await loadSteps([plan.id]);
  return { ...plan, steps: decorateSteps(steps) };
}

export async function fetchActivePlanNextSteps(): Promise<PlanNextRow[]> {
  const plans = await fetchBreedingPlans();
  return plans
    .filter((p) => p.status === 'active')
    .map((p) => ({
      plan: p,
      next: p.steps.find((s) => s.isNext) ?? null,
      blocked: p.steps.filter((s) => s.effectiveStatus === 'blocked'),
    }));
}

export type PlanPickerDog = { id: string; name: string; sex: string | null };

export async function fetchPlanPickerDogs(): Promise<PlanPickerDog[]> {
  const { data, error } = await requireSupabase()
    .from('dogs')
    .select('id, name, sex')
    .in('status', ['keep', 'stud', 'breeding_stock'])
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanPickerDog[];
}

export type PlanHeatOption = { id: string; heat_start_date: string; status: string };

export async function fetchDamHeats(damId: string): Promise<PlanHeatOption[]> {
  const { data, error } = await requireSupabase()
    .from('heat_cycles')
    .select('id, heat_start_date, status')
    .eq('dog_id', damId)
    .eq('is_predicted', false)
    .order('heat_start_date', { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanHeatOption[];
}

export type PlanLitterOption = { id: string; actual_date: string | null };

export async function fetchDamLitters(damId: string): Promise<PlanLitterOption[]> {
  const { data, error } = await requireSupabase()
    .from('litters')
    .select('id, actual_date')
    .eq('mother_id', damId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanLitterOption[];
}
