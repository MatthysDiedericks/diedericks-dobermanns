import {
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';

import { createClient } from '@/lib/supabase/server';

const today = () => format(new Date(), 'yyyy-MM-dd');
const weekAhead = () => format(new Date(Date.now() + 7 * 86_400_000), 'yyyy-MM-dd');

export async function fetchDashboardData() {
  const supabase = await createClient();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [
    littersRes,
    heatsRes,
    expectedRes,
    inHeatRes,
    enquiriesRes,
    todosRes,
    overdueRes,
    waitlistRes,
    invRes,
    expRes,
  ] = await Promise.all([
    supabase
      .from('litters')
      .select(
        'id, actual_date, go_home_date, go_home_weeks, male_count, female_count, litter_letter, mother_id, father_id',
      )
      .in('status', ['born', 'available'])
      .order('actual_date', { ascending: false }),
    supabase
      .from('heat_cycles')
      .select('*')
      .gte('expected_whelp_date', today())
      .in('status', ['in_heat', 'mated', 'confirmed_pregnant'])
      .order('expected_whelp_date', { ascending: true })
      .limit(8),
    supabase
      .from('heat_cycles')
      .select('*')
      .in('status', ['mated', 'confirmed_pregnant'])
      .order('expected_whelp_date', { ascending: true }),
    supabase.from('heat_cycles').select('*').eq('status', 'in_heat'),
    supabase
      .from('enquiries')
      .select('id, full_name, subject, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('todo_items')
      .select('*, litter:litters(litter_letter, mother:dogs!litters_mother_id_fkey(name)), dog:dogs(name)')
      .eq('is_completed', false)
      .or(`due_date.lte.${weekAhead()},due_date.is.null`)
      .order('due_date', { ascending: true })
      .limit(8),
    supabase
      .from('todo_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', false)
      .lt('due_date', today()),
    supabase.from('waiting_list').select('pipeline_stage, status, follow_up_date'),
    supabase
      .from('invoices')
      .select('amount_paid')
      .gte('issue_date', monthStart)
      .lte('issue_date', monthEnd),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd),
  ]);

  const waitlistRows = waitlistRes.data ?? [];
  const t = today();
  let active = 0;
  let awaitingDeposit = 0;
  let followUpsOverdue = 0;
  waitlistRows.forEach((r) => {
    const stage = (r.pipeline_stage ?? r.status ?? '') as string;
    if (['deposit_paid', 'matched', 'reserved', 'active', 'offered'].includes(stage)) active += 1;
    if (stage === 'quote_sent') awaitingDeposit += 1;
    if (r.follow_up_date && r.follow_up_date < t) followUpsOverdue += 1;
  });

  const income = (invRes.data ?? []).reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const expenses = (expRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const todos = (todosRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const litter = r.litter as { litter_letter: string | null; mother?: { name: string } | null } | null;
    const dog = r.dog as { name: string } | null;
    const litter_label = litter
      ? `🐾 ${litter.mother?.name ?? 'Dam'}: Litter ${litter.litter_letter ?? '?'}`
      : null;
    return { ...r, litter_label, dog_name: dog?.name };
  });

  return {
    currentLitters: littersRes.data ?? [],
    upcomingHeats: heatsRes.data ?? [],
    expectedLitters: expectedRes.data ?? [],
    inHeat: inHeatRes.data ?? [],
    enquiries: enquiriesRes.data ?? [],
    todos,
    overdueTodos: overdueRes.count ?? 0,
    waitlist: { active, awaitingDeposit, followUpsOverdue },
    finance: { income, expenses, net: income - expenses },
  };
}
