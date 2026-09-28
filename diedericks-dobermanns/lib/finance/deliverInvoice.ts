import { callNotify } from '@/lib/functions';
import { fetchInvoiceById } from '@/lib/finance/queries';
import { buildInvoicePdfBase64, buildInvoicePdfHtml } from '@/lib/finance/generatePDF';
import {
  executeInvoiceSend,
  type InvoiceSendHeader,
  type InvoiceSendRecipient,
} from '@/lib/finance/sendInvoice';
import { requireSupabase } from '@/lib/supabase';
import type { InvoiceWithDetails } from '@/types/finance';

const SITE = 'https://diedericksdobermanns.com';

async function resolveInvoiceRecipient(
  invoice: InvoiceWithDetails,
): Promise<InvoiceSendRecipient> {
  const supabase = requireSupabase();
  if (invoice.client_id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', invoice.client_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.email) {
      return {
        email: data.email,
        fullName: data.full_name ?? invoice.clientName ?? 'there',
        userId: data.id,
      };
    }
  }

  if (invoice.clientEmail) {
    return {
      email: invoice.clientEmail,
      fullName: invoice.clientName || 'there',
      userId: invoice.client_id,
    };
  }

  if (invoice.quote_id) {
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('client_id, application_id, contact_id')
      .eq('id', invoice.quote_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (quote?.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('full_name, email, user_id, merged_into_contact_id')
        .eq('id', quote.contact_id)
        .maybeSingle();
      if (contact?.email && !contact.merged_into_contact_id) {
        return {
          email: contact.email,
          fullName: contact.full_name ?? 'there',
          userId: contact.user_id,
        };
      }
    }
    if (quote?.application_id) {
      const { data: application } = await supabase
        .from('applications')
        .select('full_name, email, user_id')
        .eq('id', quote.application_id)
        .maybeSingle();
      if (application?.email) {
        return {
          email: application.email,
          fullName: application.full_name,
          userId: application.user_id,
        };
      }
    }
  }

  throw new Error(
    'This invoice has no email address to send to. Link it to a client account first.',
  );
}

function headerFrom(invoice: InvoiceWithDetails): InvoiceSendHeader {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    client_id: invoice.client_id,
    quote_id: invoice.quote_id ?? null,
    status: invoice.status,
    total_amount: Number(invoice.total_amount),
    due_date: invoice.due_date,
    sent_at: invoice.sent_at ?? null,
    sent_by: invoice.sent_by ?? null,
    sent_to: invoice.sent_to ?? null,
    send_count: Number(invoice.send_count ?? 0),
  };
}

/**
 * Emails the same PDF Download produces, then stamps sent_*.
 * Creating an invoice never calls this. dryRun skips mail and the stamp.
 */
export async function sendInvoiceToRecipient(
  invoiceOrId: InvoiceWithDetails | string,
  opts?: { actorId?: string | null; dryRun?: boolean },
): Promise<{
  sentTo: string;
  message: string;
  stamp?: {
    sent_at: string;
    sent_by: string | null;
    sent_to: string;
    send_count: number;
  };
  portalNotified?: boolean;
  dryRun?: boolean;
  pdfText?: string;
}> {
  const invoice =
    typeof invoiceOrId === 'string' ? await fetchInvoiceById(invoiceOrId) : invoiceOrId;
  const recipient = await resolveInvoiceRecipient(invoice);
  const built = opts?.dryRun
    ? { base64: '', ...(await buildInvoicePdfHtml(invoice)) }
    : await buildInvoicePdfBase64(invoice);

  const supabase = requireSupabase();
  const result = await executeInvoiceSend({
    header: headerFrom(invoice),
    recipient,
    actorId: opts?.actorId ?? null,
    pdfBase64: built.base64,
    pdfText: built.blocksText,
    siteUrl: SITE,
    dryRun: opts?.dryRun,
    transport: {
      mail: async (payload) => {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload,
        });
        if (error) return { error: error.message };
        if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
          return { error: String((data as { error?: string }).error) };
        }
        return { error: null };
      },
      notifyPortal: async (input) => {
        await callNotify({
          userId: input.userId,
          title: 'New Invoice',
          body: `Invoice ${input.invoiceNumber} for ${input.totalLabel} is ready to view.`,
          data: { href: `/portal/invoices/${input.invoiceId}` },
        });
      },
      stamp: async (invoiceId, patch) => {
        const { error } = await supabase
          .from('invoices')
          .update({
            sent_at: patch.sent_at,
            sent_by: patch.sent_by,
            sent_to: patch.sent_to,
            send_count: patch.send_count,
            ...(patch.status ? { status: patch.status } : {}),
            updated_at: patch.sent_at,
          } as never)
          .eq('id', invoiceId);
        return { error: error?.message ?? null };
      },
    },
  });

  if (result.error) throw new Error(result.error);
  return {
    sentTo: result.sentTo ?? recipient.email,
    message: result.message ?? '',
    stamp: result.stamp,
    portalNotified: result.portalNotified,
    dryRun: result.dryRun,
    pdfText: result.pdfText ?? built.blocksText,
  };
}

export async function previewInvoiceSend(invoice: InvoiceWithDetails): Promise<{
  email: string;
  fullName: string;
  sendCount: number;
  hasPortalAccount: boolean;
}> {
  const recipient = await resolveInvoiceRecipient(invoice);
  return {
    email: recipient.email,
    fullName: recipient.fullName,
    sendCount: Number(invoice.send_count ?? 0),
    hasPortalAccount: Boolean(invoice.client_id),
  };
}
