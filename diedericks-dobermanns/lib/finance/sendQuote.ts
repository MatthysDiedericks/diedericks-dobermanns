import * as Print from 'expo-print';

import { buildClientQuoteHtml } from '@/lib/finance/clientQuotePdf';
import { recordQuoteSendRevision } from '@/lib/finance/quoteRevisions';
import { requireSupabase } from '@/lib/supabase';
import type { ClientQuoteDetail } from '@/lib/portal/clientQuotes';
import type { Quote } from '@/types/app.types';

const SITE = 'https://diedericksdobermanns.com';

export type QuoteSendRecipient = {
  email: string;
  fullName: string;
  userId: string | null;
};

async function resolveRecipient(quote: Quote): Promise<QuoteSendRecipient> {
  const supabase = requireSupabase();
  if (quote.client_id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', quote.client_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.email) {
      return { email: data.email, fullName: data.full_name ?? 'there', userId: data.id };
    }
  }

  if (quote.application_id) {
    const { data, error } = await supabase
      .from('applications')
      .select('full_name, email, user_id')
      .eq('id', quote.application_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.email) {
      return {
        email: data.email,
        fullName: data.full_name,
        userId: data.user_id,
      };
    }
  }

  const contactId = (quote as Quote & { contact_id?: string | null }).contact_id;
  if (contactId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('full_name, email, user_id')
      .eq('id', contactId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.email) {
      return {
        email: data.email,
        fullName: data.full_name ?? 'there',
        userId: data.user_id,
      };
    }
  }

  throw new Error(
    'This quote has no email address to send to. Link it to a client, contact, or application first.',
  );
}

function registerCtaHtml(email: string): string {
  const href = `${SITE}/portal/register?email=${encodeURIComponent(email)}`;
  return `<p><strong>Create your portal account with this same address</strong> and your quote, application and documents will be waiting for you.</p>
    <p><a href="${href}" style="color:#C4A35A;">Create your portal account →</a></p>`;
}

function emailHtml(quote: Quote, recipient: QuoteSendRecipient, note: string | null): string {
  const rows = (quote.items ?? [])
    .map(
      (it) =>
        `<tr><td style="padding:6px 0;">${it.description}</td><td style="padding:6px 0;text-align:right;">R${Number(it.line_total).toFixed(2)}</td></tr>`,
    )
    .join('');
  const next = recipient.userId
    ? `<p>Sign in to your portal to review this quote.</p><p><a href="${SITE}/portal/quotes/${quote.id}" style="color:#C4A35A;">Open quote in your portal →</a></p>`
    : registerCtaHtml(recipient.email);
  const revision = note
    ? `<p>This is a revised quotation. ${note}</p>`
    : `<p>Please find quotation <strong>${quote.quote_number ?? ''}</strong> below.</p>`;
  return `<div style="font-family:Georgia,serif;color:#F5F0E8;background:#111008;padding:24px;">
    <p>Dear ${recipient.fullName},</p>
    ${revision}
    <table style="width:100%;">${rows}</table>
    <p style="color:#C4A35A;font-size:20px;">Total R${Number(quote.total).toFixed(2)}</p>
    ${next}
    <p>A PDF copy of the quotation is attached for your records.</p>
  </div>`;
}

/**
 * Emails the PDF, then stamps sent. Status advances only after mail succeeds.
 * Creating a quote never calls this.
 */
export async function sendQuoteToRecipient(
  quote: Quote,
  opts?: { changeNote?: string | null; actorId?: string | null },
): Promise<{ sentTo: string; revision: number }> {
  if (!quote.total || Number(quote.total) <= 0) {
    throw new Error('This quote totals R0. Set the amount before sending.');
  }

  const recipient = await resolveRecipient(quote);
  const supabase = requireSupabase();
  const detail: ClientQuoteDetail = {
    id: quote.id,
    quote_number: quote.quote_number ?? '',
    status: quote.status,
    total: Number(quote.total),
    currency: quote.currency,
    valid_until: quote.valid_until,
    sent_at: quote.sent_at ?? null,
    created_at: quote.created_at,
    last_sent_revision: quote.last_sent_revision ?? null,
    revision: quote.revision ?? null,
    notes: quote.notes,
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount),
    items: (quote.items ?? []).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
      item_type: it.item_type,
      dog_id: it.dog_id,
      litter_id: it.litter_id ?? null,
      subject_kind: it.subject_kind ?? null,
    })),
  };

  const html = buildClientQuoteHtml(detail);
  const printed = await Print.printToFileAsync({ html, base64: true });
  const pdf = printed.base64;
  if (!pdf) throw new Error('Could not build the quotation PDF.');

  const subject = opts?.changeNote
    ? `Revised quote ${quote.quote_number ?? ''}`
    : `Your application was successful — quote ${quote.quote_number ?? ''}`;

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: recipient.email,
      subject,
      html: emailHtml(quote, recipient, opts?.changeNote ?? null),
      attachments: [
        {
          filename: `Quote-${quote.quote_number ?? quote.id}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    },
  });
  if (error) throw new Error(error.message);
  const failed = data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error;
  if (failed) throw new Error(String(failed));

  const { revision } = await recordQuoteSendRevision({
    quoteId: quote.id,
    sentTo: recipient.email,
    changeNote: opts?.changeNote ?? null,
    actorId: opts?.actorId ?? null,
  });
  return { sentTo: recipient.email, revision };
}
