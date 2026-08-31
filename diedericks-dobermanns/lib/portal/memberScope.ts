import { requireSupabase } from '@/lib/supabase';

function asIds(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function fetchMyClientIds(): Promise<string[]> {
  const { data, error } = await requireSupabase().rpc('my_client_ids');
  if (error) throw new Error(error.message);
  return asIds(data);
}

export async function fetchMyFinancialClientIds(): Promise<string[]> {
  const { data, error } = await requireSupabase().rpc('my_financial_client_ids');
  if (error) throw new Error(error.message);
  return asIds(data);
}

export async function fetchMyDogIds(forUserId?: string, sessionUserId?: string): Promise<string[]> {
  const supabase = requireSupabase();
  if (forUserId && sessionUserId && forUserId !== sessionUserId) {
    const { data, error } = await supabase.rpc('dog_ids_for', { p_user_id: forUserId });
    if (error) throw new Error(error.message);
    return asIds(data);
  }
  const { data, error } = await supabase.rpc('my_dog_ids');
  if (error) throw new Error(error.message);
  return asIds(data);
}
