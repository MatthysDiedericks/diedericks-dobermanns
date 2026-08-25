import {
  differenceInDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';

import { requireSupabase } from '@/lib/supabase';
import type {
  CurrentLitterRow,
  DashboardFinanceSnapshot,
  HeatCycleWithDog,
  TodoItemWithLinks,
  WaitlistSummary,
} from '@/types/kennel';

const today = () => format(new Date(), 'yyyy-MM-dd');
const weekAhead = () => format(new Date(Date.now() + 7 * 86_400_000), 'yyyy-MM-dd');

export async function fetchCurrentLitters(): Promise<CurrentLitterRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select(
      'id, actual_date, go_home_date, go_home_weeks, male_count, female_count, litter_letter, mother_id, father_id, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name)',
    )
    .in('status', ['born', 'available'])
    .order('actual_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CurrentLitterRow[];
}

export async function fetchUpcomingHeats(limit = 8): Promise<HeatCycleWithDog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('heat_cycles')
    .select('*, dog:dogs!heat_cycles_dog_id_fkey(name, date_of_birth)')
    .gte('expected_whelp_date', today())
    .in('status', ['in_heat', 'mated', 'confirmed_pregnant'])
    .order('expected_whelp_date', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const result: HeatCycleWithDog[] = [];

  for (const row of rows) {
    const dog = row.dog as { name: string; date_of_birth: string | null } | null;
    const { count } = await supabase
      .from('litters')
      .select('*', { count: 'exact', head: true })
      .eq('mother_id', row.dog_id as string);

    result.push({
      ...(row as unknown as HeatCycleWithDog),
      dog_name: dog?.name,
      date_of_birth: dog?.date_of_birth,
      litter_count: count ?? 0,
    });
  }
  return result;
}

export async function fetchExpectedLitters(): Promise<HeatCycleWithDog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('heat_cycles')
    .select('*, dog:dogs!heat_cycles_dog_id_fkey(name)')
    .in('status', ['mated', 'confirmed_pregnant'])
    .order('expected_whelp_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const dog = r.dog as { name: string } | null;
    return {
      ...(r as unknown as HeatCycleWithDog),
      dam_name: dog?.name,
    };
  });
}

export async function fetchInHeatNotMated(): Promise<HeatCycleWithDog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('heat_cycles')
    .select(
      '*, dog:dogs!heat_cycles_dog_id_fkey(name, date_of_birth), sire:dogs!heat_cycles_sire_id_fkey(name)',
    )
    .in('status', ['in_heat', 'active'])
    .eq('is_predicted', false)
    .order('heat_start_date', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const ids = data.map((r) => (r as { id: string }).id);
  const { data: matingRows } = await supabase
    .from('matings')
    .select('heat_cycle_id')
    .in('heat_cycle_id', ids);
  const mated = new Set((matingRows ?? []).map((m) => m.heat_cycle_id));

  const result: HeatCycleWithDog[] = [];
  for (const row of data) {
    const r = row as Record<string, unknown>;
    if (mated.has(r.id as string)) continue;
    if (r.mating_date) continue;
    const dog = r.dog as { name: string; date_of_birth: string | null } | null;
    const sire = r.sire as { name: string } | null;
    const { count } = await supabase
      .from('litters')
      .select('*', { count: 'exact', head: true })
      .eq('mother_id', r.dog_id as string);

    let age_label: string | null = null;
    if (dog?.date_of_birth) {
      const days = differenceInDays(new Date(), parseISO(dog.date_of_birth));
      age_label = `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
    }

    result.push({
      ...(r as unknown as HeatCycleWithDog),
      dog_name: dog?.name,
      planned_sire_name: sire?.name ?? null,
      litter_count: count ?? 0,
      age_label,
    });
  }

  return result.sort((a, b) => {
    const da = a.heat_start_date
      ? differenceInDays(new Date(), parseISO(a.heat_start_date))
      : 0;
    const db = b.heat_start_date
      ? differenceInDays(new Date(), parseISO(b.heat_start_date))
      : 0;
    return db - da;
  });
}

export async function fetchNewEnquiries(limit = 5) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, full_name, subject, created_at, status')
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDashboardTodos(limit = 8): Promise<TodoItemWithLinks[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('todo_items')
    .select(
      '*, litter:litters(litter_letter, mother:dogs!litters_mother_id_fkey(name)), dog:dogs(name)',
    )
    .eq('is_completed', false)
    .or(`due_date.lte.${weekAhead()},due_date.is.null`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const litter = r.litter as {
      litter_letter: string | null;
      mother?: { name: string } | null;
    } | null;
    const dog = r.dog as { name: string } | null;
    const damName = litter?.mother?.name;
    const letter = litter?.litter_letter;
    const litter_label =
      litter
        ? damName
          ? `🐾 ${damName}: Litter ${letter ?? '?'}`
          : `🐾 Litter ${letter ?? '?'}`
        : null;

    return {
      ...(r as unknown as TodoItemWithLinks),
      litter_label,
      dog_name: dog?.name ?? null,
    };
  });
}

export async function fetchOverdueTodoCount(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('todo_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false)
    .lt('due_date', today());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function completeTodoItem(id: string) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('todo_items')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchWaitlistSummary(): Promise<WaitlistSummary> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('waiting_list').select('pipeline_stage, status, follow_up_date');

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const t = today();

  let active = 0;
  let awaitingDeposit = 0;
  let followUpsOverdue = 0;

  rows.forEach((r) => {
    const stage = (r.pipeline_stage ?? r.status ?? '') as string;
    if (['deposit_paid', 'matched', 'reserved', 'active', 'offered'].includes(stage)) {
      active += 1;
    }
    if (stage === 'quote_sent') awaitingDeposit += 1;
    if (r.follow_up_date && r.follow_up_date < t) followUpsOverdue += 1;
  });

  return { active, awaitingDeposit, followUpsOverdue };
}

export async function fetchFinanceSnapshot(): Promise<DashboardFinanceSnapshot> {
  const supabase = requireSupabase();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const priorStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const priorEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const [invCur, expCur, invPrior, expPrior] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount_paid')
      .gte('issue_date', monthStart)
      .lte('issue_date', monthEnd),
    supabase
      .from('expenses')
      .select('amount, vat_amount, amount_gross')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd),
    supabase
      .from('invoices')
      .select('amount_paid')
      .gte('issue_date', priorStart)
      .lte('issue_date', priorEnd),
    supabase
      .from('expenses')
      .select('amount, vat_amount, amount_gross')
      .gte('expense_date', priorStart)
      .lte('expense_date', priorEnd),
  ]);

  const sumPaid = (rows: { amount_paid?: number }[]) =>
    rows.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const sumGross = (
    rows: { amount?: number; vat_amount?: number; amount_gross?: number }[],
  ) =>
    rows.reduce(
      (s, r) => s + Number(r.amount_gross ?? Number(r.amount ?? 0) + Number(r.vat_amount ?? 0)),
      0,
    );

  const income = sumPaid(invCur.data ?? []);
  const expenses = sumGross(expCur.data ?? []);
  const priorIncome = sumPaid(invPrior.data ?? []);
  const priorExpenses = sumGross(expPrior.data ?? []);

  return {
    income,
    expenses,
    net: income - expenses,
    priorIncome,
    priorExpenses,
  };
}

export async function fetchAllDashboardData() {
  const [
    currentLitters,
    upcomingHeats,
    expectedLitters,
    inHeat,
    enquiries,
    todos,
    overdueTodos,
    waitlist,
    finance,
  ] = await Promise.all([
    fetchCurrentLitters(),
    fetchUpcomingHeats(),
    fetchExpectedLitters(),
    fetchInHeatNotMated(),
    fetchNewEnquiries(),
    fetchDashboardTodos(),
    fetchOverdueTodoCount(),
    fetchWaitlistSummary(),
    fetchFinanceSnapshot(),
  ]);

  return {
    currentLitters,
    upcomingHeats,
    expectedLitters,
    inHeat,
    enquiries,
    todos,
    overdueTodos,
    waitlist,
    finance,
  };
}
