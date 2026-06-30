import { format } from 'date-fns';

import { requireSupabase } from '@/lib/supabase';

const today = () => format(new Date(), 'yyyy-MM-dd');

export async function fetchPhase10DashboardStats() {
  const supabase = requireSupabase();

  const [dogs, littersBorn, littersExpected, applications, invoices] = await Promise.all([
    supabase.from('dogs').select('*', { count: 'exact', head: true }).neq('status', 'deceased'),
    supabase.from('litters').select('*', { count: 'exact', head: true }).eq('status', 'born'),
    supabase
      .from('litters')
      .select('*, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)')
      .eq('status', 'expected'),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review']),
    supabase.from('invoices').select('amount_outstanding').not('status', 'eq', 'paid'),
  ]);

  const puppiesAvailable = await supabase
    .from('dogs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available')
    .not('litter_id', 'is', null);

  const outstanding =
    (invoices.data ?? []).reduce((s, r) => s + Number(r.amount_outstanding ?? 0), 0);

  return {
    totalDogs: dogs.count ?? 0,
    puppiesAvailable: puppiesAvailable.count ?? 0,
    pendingApplications: applications.count ?? 0,
    invoicesOutstanding: outstanding,
    littersBorn: littersBorn.count ?? 0,
    expectedLitters: littersExpected.data ?? [],
  };
}

export async function fetchExpectedLittersTable() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select('*, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)')
    .eq('status', 'expected')
    .order('expected_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBornLitters() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select('*, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name)')
    .eq('status', 'born')
    .order('actual_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
