import { requireSupabase } from "@/lib/supabase";
import { getCachedUser } from "@/lib/auth/getCachedUser";
import { toCents } from "@/lib/finance/resolveAllocations";
import { buildConfirmExpense, costingError, type ReceiptCosting } from "@/lib/stock/confirmReceipt";
import { STOCK_WOULD_GO_NEGATIVE } from "@/lib/stock/ledger";
import { lineTotal, skuFromName, type ProductCategory, type ProductUnit } from "@/lib/stock/types";
import { fetchStockDogsAndLitters, pickStockExpenseCategoryId } from "@/lib/stock/queries";

export type ProductWriteInput = {
  sku?: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  cost_price: number;
  sell_price: number;
  vat_rate?: number;
  reorder_level?: number;
  short_description?: string | null;
  is_client_visible?: boolean;
  is_active?: boolean;
};

export async function createProduct(
  input: ProductWriteInput,
): Promise<{ id?: string; error?: string }> {
  if (!input.name.trim()) return { error: "Name is required." };
  const supabase = requireSupabase();
  const user = await getCachedUser();
  const { data, error } = await supabase
    .from("products")
    .insert({
      sku: (input.sku?.trim() || skuFromName(input.name)).slice(0, 40),
      name: input.name.trim(),
      category: input.category,
      unit: input.unit,
      cost_price: input.cost_price,
      sell_price: input.sell_price,
      vat_rate: input.vat_rate ?? 15,
      reorder_level: input.reorder_level ?? 0,
      short_description: input.short_description?.trim() || null,
      is_client_visible: Boolean(input.is_client_visible),
      is_active: input.is_active !== false,
      updated_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "That SKU already exists." };
    return { error: error.message };
  }
  return { id: data.id };
}

export async function completeReceive(input: {
  supplier_name: string;
  supplier_invoice_no: string;
  received_on: string;
  supplier_invoice_total: number;
  lines: Array<{ product_id: string; quantity: number; unit_cost: number; product_name?: string }>;
  costing: ReceiptCosting;
}): Promise<{
  error?: string;
  item_count?: number;
  quantity_total?: number;
  total?: number;
}> {
  const costErr = costingError(input.costing);
  if (costErr) return { error: costErr };
  if (!input.supplier_name.trim()) return { error: "Supplier name is required." };
  if (input.lines.length === 0) return { error: "Add at least one line." };

  const supabase = requireSupabase();
  const user = await getCachedUser();
  const linesTotal =
    input.lines.reduce((sum, l) => sum + toCents(lineTotal(l.quantity, l.unit_cost)), 0) / 100;

  const { data: receipt, error } = await supabase
    .from("stock_receipts")
    .insert({
      supplier_name: input.supplier_name.trim(),
      supplier_invoice_no: input.supplier_invoice_no.trim() || null,
      received_on: input.received_on,
      total_amount: input.supplier_invoice_total || linesTotal,
      status: "draft",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !receipt) return { error: error?.message ?? "Could not save the receipt." };

  const { error: lineErr } = await supabase.from("stock_receipt_lines").insert(
    input.lines.map((line) => ({
      receipt_id: receipt.id,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_cost: line.unit_cost,
      line_total: lineTotal(line.quantity, line.unit_cost),
    })),
  );
  if (lineErr) return { error: lineErr.message };

  const { dogDaysDogs, dogDaysLitters } = await fetchStockDogsAndLitters();
  const categoryId = await pickStockExpenseCategoryId();
  let built;
  try {
    built = buildConfirmExpense({
      supplierName: input.supplier_name.trim(),
      invoiceNo: input.supplier_invoice_no.trim() || null,
      receivedOn: input.received_on,
      supplierInvoiceTotal: input.supplier_invoice_total || linesTotal,
      costing: input.costing,
      categoryId,
      dogs: dogDaysDogs,
      litters: dogDaysLitters,
      lines: input.lines,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not cost this receipt." };
  }

  const { data, error: confirmErr } = await supabase.rpc("confirm_stock_receipt", {
    p_receipt_id: receipt.id,
    p_expense: built.payload,
  });
  if (confirmErr) return { error: confirmErr.message };
  const result = (data ?? {}) as { item_count?: number; quantity_total?: number; total?: number };
  return {
    item_count: Number(result.item_count ?? input.lines.length),
    quantity_total: Number(result.quantity_total ?? 0),
    total: Number(result.total ?? built.linesTotal),
  };
}

export async function adjustStock(input: {
  productId: string;
  quantity: number;
  reason: string;
  allowNegative?: boolean;
}): Promise<{ error?: string; negative?: boolean }> {
  if (!input.reason.trim()) return { error: "An adjustment needs a reason." };
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("record_stock_adjustment", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_reason: input.reason.trim(),
    p_allow_negative: Boolean(input.allowNegative),
  });
  if (error) {
    if (error.message.includes(STOCK_WOULD_GO_NEGATIVE)) {
      return { negative: true, error: "This would take stock below zero." };
    }
    return { error: error.message };
  }
  return {};
}
