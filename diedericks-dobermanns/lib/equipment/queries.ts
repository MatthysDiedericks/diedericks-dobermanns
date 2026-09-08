import { requireSupabase } from '@/lib/supabase';
import type {
  EquipmentEnquiry,
  EquipmentEnquiryItem,
  EquipmentEnquiryStatus,
  EquipmentFulfilment,
} from '@/lib/equipment/types';

const SELECT =
  'id, contact_id, client_id, full_name, email, phone, fulfilment, delivery_address, message, status, quote_id, created_at, updated_at, ' +
  'items:equipment_enquiry_items(id, quantity, note, catalogue_item_id, catalogue_items(id, label, code, default_price, price_varies, description_template, item_type))';

type ItemJoin = {
  id: string;
  quantity: number;
  note: string | null;
  catalogue_item_id: string;
  catalogue_items:
    | {
        id: string;
        label: string;
        code: string;
        default_price: number | null;
        price_varies: boolean;
        description_template: string | null;
        item_type: string;
      }
    | {
        id: string;
        label: string;
        code: string;
        default_price: number | null;
        price_varies: boolean;
        description_template: string | null;
        item_type: string;
      }[]
    | null;
};

function mapItem(row: ItemJoin): EquipmentEnquiryItem {
  const cat = Array.isArray(row.catalogue_items) ? row.catalogue_items[0] : row.catalogue_items;
  return {
    id: row.id,
    catalogue_item_id: row.catalogue_item_id,
    quantity: row.quantity,
    note: row.note,
    label: cat?.label ?? 'Item',
    code: cat?.code ?? null,
    default_price: cat?.default_price == null ? null : Number(cat.default_price),
    price_varies: Boolean(cat?.price_varies),
    description_template: cat?.description_template ?? null,
    item_type: cat?.item_type ?? 'accessory',
  };
}

function mapEnquiry(row: Record<string, unknown>): EquipmentEnquiry {
  const fulfilment: EquipmentFulfilment = row.fulfilment === 'delivery' ? 'delivery' : 'collection';
  const status = (['new', 'quoted', 'closed'] as EquipmentEnquiryStatus[]).includes(
    row.status as EquipmentEnquiryStatus,
  )
    ? (row.status as EquipmentEnquiryStatus)
    : 'new';
  return {
    id: String(row.id),
    contact_id: (row.contact_id as string | null) ?? null,
    client_id: (row.client_id as string | null) ?? null,
    full_name: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    fulfilment,
    delivery_address: (row.delivery_address as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    status,
    quote_id: (row.quote_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    items: ((row.items as ItemJoin[]) ?? []).map(mapItem),
  };
}

export async function fetchEquipmentEnquiries(): Promise<EquipmentEnquiry[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('equipment_enquiries' as never)
    .select(SELECT)
    .order('created_at' as never, { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapEnquiry);
}

export async function fetchEquipmentEnquiry(id: string): Promise<EquipmentEnquiry | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('equipment_enquiries' as never)
    .select(SELECT)
    .eq('id' as never, id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapEnquiry(data as unknown as Record<string, unknown>);
}

export async function updateEquipmentEnquiryStatus(
  id: string,
  status: EquipmentEnquiryStatus,
): Promise<{ error?: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('equipment_enquiries' as never)
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq('id' as never, id);
  return error ? { error: error.message } : {};
}
