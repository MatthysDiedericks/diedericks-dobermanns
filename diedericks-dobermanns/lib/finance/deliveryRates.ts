import { requireSupabase } from '@/lib/supabase';

export type DeliveryRate = {
  id: string;
  label: string;
  amount: number;
  notes: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function fetchDeliveryRates(opts?: {
  activeOnly?: boolean;
}): Promise<DeliveryRate[]> {
  const supabase = requireSupabase();
  let q = supabase
    .from('delivery_rates' as never)
    .select('id, label, amount, notes, active, sort_order, created_at, updated_at')
    .order('sort_order' as never)
    .order('label' as never);
  if (opts?.activeOnly) {
    q = q.eq('active' as never, true);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as DeliveryRate[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));
}

export async function createDeliveryRate(input: {
  label: string;
  amount: number;
  notes?: string | null;
  active?: boolean;
  sort_order?: number;
}): Promise<DeliveryRate> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('delivery_rates' as never)
    .insert({
      label: input.label.trim(),
      amount: input.amount,
      notes: input.notes ?? null,
      active: input.active ?? true,
      sort_order: input.sort_order ?? 0,
      created_by: user?.id ?? null,
    } as never)
    .select('id, label, amount, notes, active, sort_order, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as DeliveryRate;
  return { ...row, amount: Number(row.amount) };
}

export async function updateDeliveryRate(
  id: string,
  patch: {
    label: string;
    amount: number;
    notes: string | null;
    active: boolean;
    sort_order: number;
  },
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('delivery_rates' as never)
    .update({
      label: patch.label.trim(),
      amount: patch.amount,
      notes: patch.notes,
      active: patch.active,
      sort_order: patch.sort_order,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id' as never, id);
  if (error) throw new Error(error.message);
}

export async function deleteDeliveryRate(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('delivery_rates' as never)
    .delete()
    .eq('id' as never, id);
  if (error) throw new Error(error.message);
}
