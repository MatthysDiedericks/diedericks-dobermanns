"use server";

import { revalidatePath } from "next/cache";

import { requireFinance } from "@/lib/admin/finance-auth";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceItemType } from "@/types/finance";

const FINANCE_PATH = "/admin/finance";

export type CreateInvoiceInput = {
  client_id: string;
  reservation_id?: string | null;
  dog_id?: string | null;
  litter_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  discount_amount?: number;
  status?: string;
  items: Array<{
    description: string;
    item_type: InvoiceItemType;
    quantity: number;
    unit_price: number;
  }>;
};

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<{ id?: string; error?: string }> {
  await requireFinance();
  const supabase = await createClient();

  const subtotal = input.items.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0,
  );
  const discount = input.discount_amount ?? 0;
  const total_amount = subtotal - discount;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: input.client_id,
      reservation_id: input.reservation_id ?? null,
      dog_id: input.dog_id ?? null,
      litter_id: input.litter_id ?? null,
      issue_date: input.issue_date,
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      internal_notes: input.internal_notes ?? null,
      discount_amount: discount,
      subtotal,
      total_amount,
      status: input.status ?? "draft",
      invoice_number: "",
    })
    .select("id")
    .single();

  if (error || !invoice) return { error: error?.message ?? "Failed to create" };

  const itemRows = input.items.map((item, index) => ({
    invoice_id: invoice.id,
    description: item.description,
    item_type: item.item_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    sort_order: index,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemRows);

  if (itemsError) return { error: itemsError.message };

  revalidatePath(`${FINANCE_PATH}/invoices`);
  return { id: invoice.id };
}

export async function recordPayment(input: {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const { user } = await requireFinance();
  const supabase = await createClient();

  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: input.invoice_id,
    amount: input.amount,
    payment_date: input.payment_date,
    payment_method: input.payment_method ?? null,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    recorded_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`${FINANCE_PATH}/invoices/${input.invoice_id}`);
  revalidatePath(FINANCE_PATH);
  return {};
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  await requireFinance();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`${FINANCE_PATH}/invoices/${id}`);
  return {};
}

export type CreateExpenseInput = {
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  supplier_name?: string | null;
  invoice_reference?: string | null;
  dog_id?: string | null;
  litter_id?: string | null;
  receipt_url?: string | null;
  is_recurring?: boolean;
  recurring_interval?: string | null;
  recurring_end_date?: string | null;
  notes?: string | null;
};

export async function createExpense(
  input: CreateExpenseInput,
): Promise<{ error?: string }> {
  const { user } = await requireFinance();
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    ...input,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`${FINANCE_PATH}/expenses`);
  revalidatePath(FINANCE_PATH);
  return {};
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  await requireFinance();
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`${FINANCE_PATH}/expenses`);
  return {};
}
