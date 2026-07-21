import { requireSupabase } from '@/lib/supabase';
import type { CurrentLitterRow } from '@/types/kennel';

const LITTER_YEAR_SELECT =
  'id, actual_date, go_home_date, go_home_weeks, male_count, female_count, litter_letter, mother_id, father_id, status, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name)';

/** All litters whelped in a given year, any status — unlike fetchCurrentLitters(), which only
 * shows born/available. Used for the dashboard year switcher and the Litters tab year pills. */
export async function fetchLittersByYear(year: number): Promise<CurrentLitterRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select(LITTER_YEAR_SELECT)
    .gte('actual_date', `${year}-01-01`)
    .lte('actual_date', `${year}-12-31`)
    .order('actual_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CurrentLitterRow[];
}

/** Every year that has at least one litter, newest first. */
export async function fetchLitterYears(): Promise<number[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('litters')
    .select('actual_date')
    .not('actual_date', 'is', null);
  if (error) throw new Error(error.message);
  const years = new Set((data ?? []).map((r) => new Date(r.actual_date as string).getFullYear()));
  return [...years].sort((a, b) => b - a);
}
