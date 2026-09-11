import { parsePhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import type { EquipmentFulfilment, ShopBasketItem } from '@/lib/equipment/types';

export type SubmitEquipmentEnquiryInput = {
  full_name: string;
  email: string;
  phone: string;
  fulfilment: EquipmentFulfilment;
  delivery_address: string | null;
  message: string | null;
  marketing_opt_in: boolean;
  items: ShopBasketItem[];
};

/** Public write path. Never insert into the enquiry tables from the client. */
export async function submitEquipmentEnquiry(
  input: SubmitEquipmentEnquiryInput,
): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Shop is not connected.' };
  if (input.items.length === 0) return { id: null, error: 'Add at least one item.' };
  if (!input.full_name.trim()) return { id: null, error: 'Name and phone are required.' };
  const phone = parsePhone(input.phone);
  if (!phone.ok) return { id: null, error: phone.error };
  if (!input.email.trim().includes('@')) return { id: null, error: 'A valid email is required.' };
  if (input.fulfilment === 'delivery' && !input.delivery_address?.trim()) {
    return { id: null, error: 'Delivery address is required when you choose delivery.' };
  }

  const { data, error } = await supabase.rpc('submit_equipment_enquiry' as never, {
    p_full_name: input.full_name.trim(),
    p_email: input.email.trim(),
    p_phone: phone.value,
    p_fulfilment: input.fulfilment,
    p_address: input.fulfilment === 'delivery' ? input.delivery_address?.trim() ?? null : null,
    p_message: input.message?.trim() || null,
    p_marketing: input.marketing_opt_in === true,
    p_items: input.items.map((it) => ({
      catalogue_item_id: it.catalogue_item_id,
      quantity: it.quantity,
    })),
  } as never);

  if (error) return { id: null, error: error.message };
  return { id: typeof data === 'string' ? data : null, error: null };
}
