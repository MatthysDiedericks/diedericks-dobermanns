import { requireSupabase } from '@/lib/supabase';
import type { RecurringInvoice, RecurringInvoiceInput } from '@/lib/finance/recurringInvoiceTypes';

const SELECT =
  '*, contact:contacts(full_name, email), dog:dogs(name)';

export async function fetchRecurringInvoices(): Promise<RecurringInvoice[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('recurring_invoices' as never)
    .select(SELECT)
    .order('next_issue_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RecurringInvoice[];
}

export async function fetchRecurringInvoice(id: string): Promise<RecurringInvoice | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('recurring_invoices' as never)
    .select(SELECT)
    .eq('id' as never, id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as RecurringInvoice | null) ?? null;
}

export async function createRecurringInvoice(input: RecurringInvoiceInput): Promise<string> {
  if (!input.client_id && !input.contact_id) {
    throw new Error('Pick a client or contact — a schedule cannot invoice nobody.');
  }
  const supabase = requireSupabase();
  let clientId = input.client_id ?? null;
  if (!clientId && input.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('email, user_id')
      .eq('id', input.contact_id)
      .maybeSingle();
    if (contact?.user_id) clientId = contact.user_id;
    else if (contact?.email) {
      const { data: portalId } = await supabase.rpc('resolve_confirmed_user_id' as never, {
        p_email: contact.email.trim().toLowerCase(),
      } as never);
      clientId = (portalId as string | null) ?? null;
    }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('recurring_invoices' as never)
    .insert({
      ...input,
      client_id: clientId,
      is_active: true,
      created_by: user?.id ?? null,
    } as never)
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create schedule.');
  return (data as { id: string }).id;
}

export async function generateDueRecurringInvoices(): Promise<number> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('generate_due_recurring_invoices' as never);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as unknown[]).length : 0;
}

export async function setRecurringInvoiceActive(id: string, isActive: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('recurring_invoices' as never)
    .update({ is_active: isActive } as never)
    .eq('id' as never, id);
  if (error) throw new Error(error.message);
}
