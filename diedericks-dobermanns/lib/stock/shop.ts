import {
  isProductCategory,
  isProductUnit,
  type ProductCategory,
  type ProductUnit,
} from "@/lib/stock/types";

/** Explicit shop columns. Never `select("*")` — that is how cost_price would return. */
export const SHOP_PRODUCT_SELECT =
  "id, sku, name, category, unit, sell_price, vat_rate, image_path, short_description, in_stock";

export const SHOP_PRODUCT_KEYS = [
  "id",
  "sku",
  "name",
  "category",
  "unit",
  "sell_price",
  "vat_rate",
  "image_path",
  "short_description",
  "in_stock",
] as const;

const FORBIDDEN_SHOP_KEYS = [
  "cost_price",
  "qty_on_hand",
  "reorder_level",
  "unit_cost",
  "supplier_name",
  "supplier_invoice_no",
] as const;

export type ShopProduct = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  sell_price: number;
  vat_rate: number;
  image_path: string | null;
  short_description: string | null;
  in_stock: boolean;
};

/** Same gate as v_shop_products.WHERE. Inactive or internal products never appear. */
export function shopProductVisible(p: {
  is_active: boolean;
  is_client_visible: boolean;
}): boolean {
  return p.is_active && p.is_client_visible;
}

/** Same expression as v_shop_products.in_stock. No movements → false. */
export function shopInStockFromMovements(quantities: ReadonlyArray<{ quantity: number }>): boolean {
  return quantities.reduce((sum, m) => sum + Number(m.quantity), 0) > 0;
}

/**
 * Fails loudly if cost (or a count, or a supplier field) is on a shop payload.
 * This is the permanent fix: the migration is today's repair.
 */
export function assertShopPayloadHasNoCost(payload: unknown): void {
  const rows = Array.isArray(payload) ? payload : [payload];
  for (const row of rows) {
    if (row == null || typeof row !== "object") continue;
    const keys = Object.keys(row as Record<string, unknown>);
    for (const forbidden of FORBIDDEN_SHOP_KEYS) {
      if (keys.includes(forbidden)) {
        throw new Error(`LEAK: ${forbidden} is on the shop payload`);
      }
    }
    const json = JSON.stringify(row);
    if (/"cost_price"\s*:/.test(json)) {
      throw new Error("LEAK: cost_price is on the shop payload");
    }
  }
}

export function mapShopProduct(row: Record<string, unknown>): ShopProduct {
  assertShopPayloadHasNoCost(row);
  const category =
    typeof row.category === "string" && isProductCategory(row.category) ? row.category : "other";
  const unit = typeof row.unit === "string" && isProductUnit(row.unit) ? row.unit : "each";
  return {
    id: String(row.id),
    sku: String(row.sku ?? ""),
    name: String(row.name ?? ""),
    category,
    unit,
    sell_price: Number(row.sell_price) || 0,
    vat_rate: Number(row.vat_rate) || 15,
    image_path: typeof row.image_path === "string" ? row.image_path : null,
    short_description: typeof row.short_description === "string" ? row.short_description : null,
    in_stock: Boolean(row.in_stock),
  };
}

export async function fetchShopProducts(): Promise<ShopProduct[]> {
  const { supabase } = await import("@/lib/supabase");
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("v_shop_products")
    .select(SHOP_PRODUCT_SELECT)
    .order("name");
  if (error) throw new Error(error.message);
  assertShopPayloadHasNoCost(data);
  return ((data ?? []) as Record<string, unknown>[]).map(mapShopProduct);
}
