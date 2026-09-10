import type { CatalogueItem, EquipmentTypeRow, LastChargeRow } from '@/lib/finance/catalogue';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { requireSupabase, supabase } from '@/lib/supabase';

const SELECT =
  'id, code, label, item_type, category, default_price, price_varies, description_template, notes, is_active, sort_order, image_path, short_description, is_client_visible, stock_status, equipment_type';

function mapRow(r: Record<string, unknown>): CatalogueItem {
  const stock = r.stock_status === 'made_to_order' || r.stock_status === 'sold_out'
    ? r.stock_status
    : 'in_stock';
  return {
    id: String(r.id),
    code: String(r.code),
    label: String(r.label),
    item_type: String(r.item_type),
    category: r.category as CatalogueItem['category'],
    default_price: r.default_price == null ? null : Number(r.default_price),
    price_varies: Boolean(r.price_varies),
    description_template: (r.description_template as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    is_active: Boolean(r.is_active),
    sort_order: Number(r.sort_order ?? 0),
    image_path: (r.image_path as string | null) ?? null,
    short_description: (r.short_description as string | null) ?? null,
    is_client_visible: Boolean(r.is_client_visible),
    stock_status: stock,
    equipment_type: typeof r.equipment_type === 'string' ? r.equipment_type : null,
  };
}

export async function fetchActiveEquipmentTypes(): Promise<EquipmentTypeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('equipment_types')
    .select('key, label, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return (data ?? []).map((r: { key: string; label: string; sort_order: number }) => ({
    key: r.key,
    label: r.label,
    sort_order: r.sort_order,
  }));
}

/** Shop grid: active and client-visible. Both flags must be true. */
export async function fetchShopCatalogueItems(): Promise<CatalogueItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('catalogue_items')
    .select(SELECT)
    .eq('is_active', true)
    .eq('is_client_visible', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export async function fetchActiveCatalogueItems(): Promise<CatalogueItem[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalogue_items')
    .select(SELECT)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export async function fetchAllCatalogueItems(): Promise<CatalogueItem[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalogue_items')
    .select(SELECT)
    .order('category')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export type StockListItem = CatalogueItem & {
  quote_lines: number;
  updated_at: string | null;
};

function sortStockList(items: StockListItem[]): StockListItem[] {
  return [...items].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if (a.is_client_visible !== b.is_client_visible) return a.is_client_visible ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.label.localeCompare(b.label);
  });
}

/** Every catalogue row plus quote usage — the stock list. */
export async function fetchStockList(): Promise<StockListItem[]> {
  const supabase = requireSupabase();
  const [{ data, error }, usage] = await Promise.all([
    supabase.from('catalogue_items').select(`${SELECT}, updated_at`),
    fetchCatalogueUsageCounts(),
  ]);
  if (error) throw new Error(error.message);
  const items: StockListItem[] = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const row = mapRow(r);
    return {
      ...row,
      quote_lines: usage[row.code] ?? 0,
      updated_at: typeof r.updated_at === 'string' ? r.updated_at : null,
    };
  });
  return sortStockList(items);
}

export async function fetchCatalogueUsageCounts(): Promise<Record<string, number>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quote_items')
    .select('catalogue_code')
    .not('catalogue_code', 'is', null);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { catalogue_code: string | null }[]) {
    const code = row.catalogue_code;
    if (!code) continue;
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

type QuoteItemJoin = {
  line_total: number | string;
  quotes:
    | { quote_number: string; created_at: string; client_id: string | null }
    | { quote_number: string; created_at: string; client_id: string | null }[]
    | null;
};

async function enrichLastCharges(rows: QuoteItemJoin[]): Promise<LastChargeRow[]> {
  const supabase = requireSupabase();
  const normalised = rows
    .map((r) => {
      const q = Array.isArray(r.quotes) ? r.quotes[0] : r.quotes;
      if (!q) return null;
      return {
        line_total: Number(r.line_total),
        quote_number: q.quote_number,
        created_at: q.created_at,
        client_id: q.client_id,
      };
    })
    .filter(Boolean) as {
    line_total: number;
    quote_number: string;
    created_at: string;
    client_id: string | null;
  }[];

  normalised.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const top = normalised.slice(0, 6);
  const clientIds = [...new Set(top.map((r) => r.client_id).filter(Boolean))] as string[];
  const destByUser = new Map<string, string>();

  if (clientIds.length) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('user_id, city, country')
      .in('user_id', clientIds);
    for (const c of (contacts ?? []) as {
      user_id: string | null;
      city: string | null;
      country: string | null;
    }[]) {
      if (!c.user_id) continue;
      destByUser.set(c.user_id, c.city?.trim() || c.country?.trim() || '');
    }
    const missing = clientIds.filter((id) => !destByUser.get(id));
    if (missing.length) {
      const { data: users } = await supabase.from('users').select('id, country').in('id', missing);
      for (const u of (users ?? []) as { id: string; country: string | null }[]) {
        if (u.country) destByUser.set(u.id, u.country);
      }
    }
  }

  return top.map((r) => ({
    line_total: r.line_total,
    quote_number: r.quote_number,
    created_at: r.created_at,
    destination: r.client_id ? destByUser.get(r.client_id) || null : null,
  }));
}

export async function fetchLastChargesForCode(code: string): Promise<LastChargeRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quote_items')
    .select('line_total, catalogue_code, quotes(quote_number, created_at, client_id)')
    .eq('catalogue_code', code)
    .limit(24);
  if (error) throw new Error(error.message);
  return enrichLastCharges((data ?? []) as unknown as QuoteItemJoin[]);
}

export async function resolveBuyerCountry(input: {
  clientId: string | null;
  applicationId: string | null;
}): Promise<string | null> {
  const supabase = requireSupabase();
  if (input.clientId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('country')
      .eq('user_id', input.clientId)
      .maybeSingle();
    if (contact?.country) return contact.country as string;
    const { data: user } = await supabase
      .from('users')
      .select('country')
      .eq('id', input.clientId)
      .maybeSingle();
    if (user?.country) return user.country as string;
  }
  if (input.applicationId) {
    const { data: app } = await supabase
      .from('applications')
      .select('country')
      .eq('id', input.applicationId)
      .maybeSingle();
    if (app?.country) return app.country as string;
  }
  return null;
}

export type CatalogueWriteInput = {
  code: string;
  label: string;
  item_type: string;
  category: CatalogueItem['category'];
  default_price: number | null;
  price_varies: boolean;
  description_template: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  image_path?: string | null;
  short_description?: string | null;
  is_client_visible?: boolean;
  stock_status?: CatalogueItem['stock_status'];
  equipment_type?: string | null;
};

function validatePrice(input: CatalogueWriteInput): string | null {
  if (!input.price_varies && (input.default_price == null || Number.isNaN(input.default_price))) {
    return 'Turn off “price varies” only when you set a default price.';
  }
  return null;
}

export async function createCatalogueItem(input: CatalogueWriteInput): Promise<{ error?: string }> {
  const priceErr = validatePrice(input);
  if (priceErr) return { error: priceErr };
  const supabase = requireSupabase();
  const user = await getCachedUser();
  const { error } = await supabase.from('catalogue_items').insert({
    ...input,
    updated_by: user?.id ?? null,
  });
  if (error) {
    if (error.message.includes('catalogue_price_consistent')) {
      return { error: 'Turn off “price varies” only when you set a default price.' };
    }
    return { error: error.message };
  }
  return {};
}

export async function updateCatalogueItem(
  id: string,
  input: Partial<CatalogueWriteInput>,
): Promise<{ error?: string }> {
  if (input.price_varies === false && (input.default_price == null || Number.isNaN(Number(input.default_price)))) {
    return { error: 'Turn off “price varies” only when you set a default price.' };
  }
  const supabase = requireSupabase();
  const user = await getCachedUser();
  const { error } = await supabase
    .from('catalogue_items')
    .update({ ...input, updated_by: user?.id ?? null })
    .eq('id', id);
  if (error) {
    if (error.message.includes('catalogue_price_consistent')) {
      return { error: 'Turn off “price varies” only when you set a default price.' };
    }
    return { error: error.message };
  }
  return {};
}

export async function deactivateCatalogueItem(id: string): Promise<{ error?: string }> {
  return updateCatalogueItem(id, { is_active: false });
}

export async function reactivateCatalogueItem(id: string): Promise<{ error?: string }> {
  return updateCatalogueItem(id, { is_active: true });
}

export async function setCatalogueClientVisible(
  id: string,
  visible: boolean,
): Promise<{ error?: string }> {
  return updateCatalogueItem(id, { is_client_visible: visible });
}
