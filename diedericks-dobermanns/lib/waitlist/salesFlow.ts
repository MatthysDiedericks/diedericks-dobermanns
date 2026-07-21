import { createInvoice, recordInvoicePayment } from '@/hooks/useInvoices';
import { entryDisplayName } from '@/lib/waitlist/helpers';
import { updateWaitlistEntry } from '@/lib/waitlist/mutations';
import type { WaitingListEntry } from '@/types/app.types';

const round2 = (n: number) => Math.round(n * 100) / 100;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The dog/litter name to show on generated invoice line items — falls back sensibly. */
function matchLabel(entry: WaitingListEntry): string {
  return entry.assigned_dog?.name ?? entry.assigned_litter?.name ?? entryDisplayName(entry);
}

/**
 * "Record Deposit" action (Task 4): creates a real paid invoice for the deposit,
 * records the payment against it (the `sync_invoice_amount_paid` trigger then bumps
 * the invoice to `status: 'paid'` automatically), then updates the waiting_list row.
 *
 * The invoice + payment are created first and are never rolled back — if the
 * follow-up waiting_list update fails, the money-adjacent records still stand and
 * the error is returned for the admin to reconcile manually.
 */
export async function recordWaitlistDeposit(
  entry: WaitingListEntry,
  amount: number,
  method?: string | null,
  reference?: string | null,
): Promise<{ error: string | null; invoiceId?: string }> {
  const today = todayISO();
  const label = matchLabel(entry);

  let invoiceId: string;
  try {
    invoiceId = await createInvoice({
      client_id: entry.client_id ?? null,
      historical_client_name: entry.client_id ? null : entryDisplayName(entry),
      dog_id: entry.assigned_dog_id ?? null,
      litter_id: entry.assigned_litter_id ?? entry.litter_id ?? null,
      issue_date: today,
      due_date: today,
      discount_amount: 0,
      notes: `Deposit for waiting list entry (${label})`,
      items: [{ description: `Deposit — ${label}`, item_type: 'deposit', quantity: 1, unit_price: round2(amount) }],
    });
    await recordInvoicePayment(invoiceId, round2(amount), today, method ?? undefined, reference ?? undefined);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not record deposit' };
  }

  const { error } = await updateWaitlistEntry(entry.id, {
    pipeline_stage: 'deposit_paid',
    status: 'active',
    payment_status: 'deposit_paid',
    deposit_amount: round2(amount),
    deposit_paid_date: today,
    deposit_invoice_id: invoiceId,
  });
  return { error, invoiceId };
}

/**
 * Handover side-effect (Task 6): auto-creates a draft balance invoice for
 * `quoted_price - deposit_amount`, due today. Skips cleanly (no error) if there's
 * no quoted price on file or nothing is actually outstanding.
 */
export async function createHandoverBalanceInvoice(
  entry: WaitingListEntry,
): Promise<{ error: string | null; invoiceId?: string | null }> {
  const balance = round2((entry.quoted_price ?? 0) - (entry.deposit_amount ?? 0));
  if (!entry.quoted_price || balance <= 0) {
    console.info('[waitlist] Skipping balance invoice — no quoted price, or nothing outstanding.');
    return { error: null, invoiceId: null };
  }

  const today = todayISO();
  const label = matchLabel(entry);

  let invoiceId: string;
  try {
    invoiceId = await createInvoice({
      client_id: entry.client_id ?? null,
      historical_client_name: entry.client_id ? null : entryDisplayName(entry),
      dog_id: entry.assigned_dog_id ?? null,
      litter_id: entry.assigned_litter_id ?? entry.litter_id ?? null,
      issue_date: today,
      due_date: today,
      discount_amount: 0,
      notes: `Balance due on delivery (${label})`,
      items: [{ description: `Balance due — ${label}`, item_type: 'dog_sale', quantity: 1, unit_price: balance }],
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not create balance invoice' };
  }

  const { error } = await updateWaitlistEntry(entry.id, { balance_invoice_id: invoiceId });
  return { error, invoiceId };
}
