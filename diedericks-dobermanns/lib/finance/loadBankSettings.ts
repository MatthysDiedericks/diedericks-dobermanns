import { requireSupabase } from '@/lib/supabase';

export async function fetchAppSettingsMap(): Promise<Record<string, string>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.value) map[row.key] = row.value;
  }
  return map;
}
