import { requireSupabase } from '@/lib/supabase';

export type UnallocatedDog = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  programme_tier: string | null;
};

export type ClientOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

/**
 * Actionable backlog: sold, no portal owner, still `unknown`.
 * Parked `lost_contact` sales stay on litter / pedigree and are excluded.
 */
export function applyUnallocatedSalesFilter<
  Q extends {
    eq: (column: string, value: string) => Q;
    is: (column: string, value: null) => Q;
  },
>(query: Q): Q {
  return query.eq('status', 'sold').is('owner_id', null).eq('ownership_status', 'unknown');
}

export async function fetchUnallocatedDogs(): Promise<UnallocatedDog[]> {
  const supabase = requireSupabase();
  const { data, error } = await applyUnallocatedSalesFilter(
    supabase.from('dogs').select('id, name, status, created_at, programme_tier'),
  ).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UnallocatedDog[];
}

export async function countUnallocatedDogs(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await applyUnallocatedSalesFilter(
    supabase.from('dogs').select('id', { count: 'exact', head: true }),
  );
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchClientUsers(): Promise<ClientOption[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientOption[];
}
