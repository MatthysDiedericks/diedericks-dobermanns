import type { PlanStatus, StepWrite } from '@/lib/breeding/planTypes';
import { requireSupabase } from '@/lib/supabase';

async function bumpOrders(planId: string): Promise<{ id: string; step_order: number }[]> {
  const { data, error } = await requireSupabase()
    .from('breeding_plan_steps')
    .select('id, step_order')
    .eq('plan_id', planId)
    .order('step_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; step_order: number }[];
}

async function writeOrders(rows: { id: string; step_order: number }[]): Promise<void> {
  const client = requireSupabase();
  for (const row of rows) {
    const { error } = await client
      .from('breeding_plan_steps')
      .update({ step_order: row.step_order + 1000 })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
  }
  for (const [index, row] of rows.entries()) {
    const { error } = await client
      .from('breeding_plan_steps')
      .update({ step_order: index + 1 })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
  }
}

export async function createBreedingPlan(input: {
  name: string;
  objective: string;
}): Promise<string> {
  const client = requireSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data, error } = await client
    .from('breeding_plans')
    .insert({
      name: input.name.trim(),
      objective: input.objective.trim(),
      status: 'active',
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateBreedingPlan(
  id: string,
  patch: { name?: string; objective?: string; status?: PlanStatus },
): Promise<void> {
  const { error } = await requireSupabase().from('breeding_plans').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

function stepPayload(planId: string, order: number, input: StepWrite) {
  return {
    plan_id: planId,
    step_order: order,
    title: input.title.trim(),
    detail: input.detail?.trim() || null,
    step_type: input.step_type,
    status: input.status,
    dam_id: input.dam_id || null,
    sire_id: input.sire_id || null,
    litter_id: input.litter_id || null,
    heat_cycle_id: input.heat_cycle_id || null,
    result_dog_id: input.result_dog_id || null,
    expected_start: input.expected_start || null,
    expected_end: input.expected_end || null,
    actual_at: input.actual_at || null,
    blocked_reason: input.blocked_reason?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function addBreedingPlanStep(
  planId: string,
  input: StepWrite,
  insertAfterOrder?: number,
): Promise<string> {
  const existing = await bumpOrders(planId);
  const insertAt =
    insertAfterOrder == null
      ? (existing[existing.length - 1]?.step_order ?? 0) + 1
      : insertAfterOrder + 1;
  const client = requireSupabase();
  const toShift = existing
    .filter((r) => r.step_order >= insertAt)
    .sort((a, b) => b.step_order - a.step_order);
  for (const row of toShift) {
    const { error } = await client
      .from('breeding_plan_steps')
      .update({ step_order: row.step_order + 1 })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
  }
  const { data, error } = await client
    .from('breeding_plan_steps')
    .insert(stepPayload(planId, insertAt, input))
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateBreedingPlanStep(
  planId: string,
  id: string,
  input: StepWrite,
): Promise<void> {
  const existing = await bumpOrders(planId);
  const current = existing.find((r) => r.id === id);
  const { error } = await requireSupabase()
    .from('breeding_plan_steps')
    .update(stepPayload(planId, current?.step_order ?? 1, input))
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function skipBreedingPlanStep(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('breeding_plan_steps')
    .update({ status: 'skipped' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moveBreedingPlanStep(
  planId: string,
  stepId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const rows = await bumpOrders(planId);
  const index = rows.findIndex((r) => r.id === stepId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;
  const next = [...rows];
  const a = next[index];
  const b = next[swapWith];
  if (!a || !b) return;
  next[index] = b;
  next[swapWith] = a;
  await writeOrders(next);
}
