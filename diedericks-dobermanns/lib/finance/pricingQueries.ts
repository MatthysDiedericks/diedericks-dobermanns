import { requireSupabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database.types';

export type PricingTier = Tables<'pricing_tiers'>;

const PRICING_TIER_COLUMNS =
  'id, tier_key, display_label, description, price, currency, is_public, sort_order, updated_by, updated_at, created_at';

/** All tiers in display order. Used by admin pricing screen and auto-quote. */
export async function fetchPricingTiers(): Promise<PricingTier[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select(PRICING_TIER_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PricingTier[];
}

/** Single tier by its key — used when pricing a quote from an application. */
export async function fetchPricingTier(tierKey: string): Promise<PricingTier | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select(PRICING_TIER_COLUMNS)
    .eq('tier_key', tierKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PricingTier | null) ?? null;
}

/** Admin-only. Updates price / label / description / is_public. */
export async function updatePricingTier(
  id: string,
  patch: Pick<TablesUpdate<'pricing_tiers'>, 'price' | 'display_label' | 'description' | 'is_public'>,
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('pricing_tiers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
