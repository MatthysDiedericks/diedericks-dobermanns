import { requireSupabase } from "@/lib/supabase";
import type { DogDaysDog, DogDaysLitter } from "@/lib/finance/dogDays";
import {
  isProductCategory,
  isProductUnit,
  type Product,
  type ProductStock,
  type StockMovement,
} from "@/lib/stock/types";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapProduct(r: Record<string, unknown>): Product {
  const category = typeof r.category === "string" && isProductCategory(r.category) ? r.category : "other";
  const unit = typeof r.unit === "string" && isProductUnit(r.unit) ? r.unit : "each";
  return {
    id: String(r.id),
    sku: String(r.sku),
    name: String(r.name),
    category,
    unit,
    cost_price: num(r.cost_price),
    sell_price: num(r.sell_price),
    vat_rate: num(r.vat_rate, 15),
    reorder_level: Math.round(num(r.reorder_level)),
    image_path: typeof r.image_path === "string" ? r.image_path : null,
    short_description: typeof r.short_description === "string" ? r.short_description : null,
    is_client_visible: Boolean(r.is_client_visible),
    is_active: r.is_active !== false,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    updated_by: typeof r.updated_by === "string" ? r.updated_by : null,
  };
}

export async function fetchProductStockList(): Promise<ProductStock[]> {
  const supabase = requireSupabase();
  const [{ data, error }, last] = await Promise.all([
    supabase.from("v_product_stock").select("*").order("name"),
    supabase
      .from("stock_movements")
      .select("product_id, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(800),
  ]);
  if (error) throw new Error(error.message);
  const lastByProduct = new Map<string, string>();
  for (const row of last.data ?? []) {
    if (!lastByProduct.has(row.product_id)) lastByProduct.set(row.product_id, row.occurred_at);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const qty = num(r.qty_on_hand);
    const reorder = Math.round(num(r.reorder_level));
    return {
      ...mapProduct(r),
      qty_on_hand: qty,
      needs_reorder: r.needs_reorder == null ? qty <= reorder : Boolean(r.needs_reorder),
      last_movement_at: lastByProduct.get(String(r.id)) ?? null,
    };
  });
}

export async function fetchProductById(id: string): Promise<ProductStock | null> {
  const rows = await fetchProductStockList();
  return rows.find((r) => r.id === id) ?? null;
}

export async function fetchProductMovements(productId: string): Promise<StockMovement[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "id, product_id, movement_type, quantity, unit_cost, reason, occurred_at, receipt_id, invoice_id, dog_id, litter_id, created_by, created_at",
    )
    .eq("product_id", productId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    quantity: num(r.quantity),
    unit_cost: r.unit_cost == null ? null : num(r.unit_cost),
    movement_type: r.movement_type as StockMovement["movement_type"],
  }));
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapProduct);
}

export async function fetchSupplierNames(): Promise<string[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("stock_receipts")
    .select("supplier_name")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    const name = row.supplier_name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

export async function fetchStockDogsAndLitters(): Promise<{
  dogs: Array<{ id: string; name: string }>;
  litters: Array<{ id: string; label: string }>;
  dogDaysDogs: DogDaysDog[];
  dogDaysLitters: DogDaysLitter[];
}> {
  const supabase = requireSupabase();
  const [dogsRes, littersRes] = await Promise.all([
    supabase
      .from("dogs")
      .select(
        "id, name, call_name, date_of_birth, status, deceased_at, ownership_status, ownership_status_at, litter_id, outcome, outcome_date, handover_date, placement_date, delivered_at, category",
      )
      .order("name")
      .limit(500),
    supabase
      .from("litters")
      .select("id, name, litter_letter, actual_date, go_home_date, go_home_weeks, mother_id")
      .order("actual_date", { ascending: false, nullsFirst: false })
      .limit(80),
  ]);
  if (dogsRes.error) throw new Error(dogsRes.error.message);
  if (littersRes.error) throw new Error(littersRes.error.message);
  return {
    dogs: (dogsRes.data ?? []).map((d) => ({
      id: d.id,
      name: (d.call_name as string | null)?.trim() || d.name,
    })),
    litters: (littersRes.data ?? []).map((l) => {
      const name = l.name ?? (l.litter_letter ? `Litter ${l.litter_letter}` : "Litter");
      return { id: l.id, label: l.actual_date ? `${name} · ${l.actual_date}` : name };
    }),
    dogDaysDogs: (dogsRes.data ?? []) as DogDaysDog[],
    dogDaysLitters: (littersRes.data ?? []) as DogDaysLitter[],
  };
}

export async function pickStockExpenseCategoryId(): Promise<string | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const feed = rows.find((c) => /feed|food|stock|kennel/i.test(c.name));
  return feed?.id ?? rows[0]?.id ?? null;
}
