export const PRODUCT_CATEGORIES = [
  { value: "feed", label: "Feed" },
  { value: "supplement", label: "Supplement" },
  { value: "collar_lead", label: "Collar / lead" },
  { value: "training_equipment", label: "Training equipment" },
  { value: "apparel", label: "Apparel" },
  { value: "starter_pack", label: "Starter pack" },
  { value: "other", label: "Other" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];

export const PRODUCT_UNITS = [
  { value: "each", label: "Each" },
  { value: "kg", label: "kg" },
  { value: "bag", label: "Bag" },
  { value: "pack", label: "Pack" },
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

export const STOCK_MOVEMENT_TYPES = [
  "receive",
  "sale",
  "adjustment",
  "write_off",
  "internal_use",
  "return",
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const RECEIPT_STATUSES = ["draft", "confirmed"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  cost_price: number;
  sell_price: number;
  vat_rate: number;
  reorder_level: number;
  image_path: string | null;
  short_description: string | null;
  is_client_visible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type ProductStock = Product & {
  qty_on_hand: number;
  needs_reorder: boolean;
  last_movement_at: string | null;
};

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  occurred_at: string;
  receipt_id: string | null;
  invoice_id: string | null;
  dog_id: string | null;
  litter_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockReceiptLineInput = {
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
};

export type PlannedMovement = {
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  invoice_id?: string | null;
  receipt_id?: string | null;
};

export function isProductCategory(value: string): value is ProductCategory {
  return PRODUCT_CATEGORIES.some((c) => c.value === value);
}

export function isProductUnit(value: string): value is ProductUnit {
  return PRODUCT_UNITS.some((u) => u.value === value);
}

export function productCategoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function marginPercent(cost: number, sell: number): number | null {
  if (!(sell > 0)) return null;
  return ((sell - cost) / sell) * 100;
}

export function lineTotal(quantity: number, unitCost: number): number {
  return Math.round(quantity * unitCost * 100) / 100;
}

export function skuFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
