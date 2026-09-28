/**
 * Invoice send — the quote send pattern, not a second renderer.
 *
 * sent_at is the *last* successful email. Resend overwrites it and increments
 * send_count. There is no first_sent_at: the count is the chase history.
 * Mail must succeed before any column is stamped.
 */

import { formatAmount, formatDate } from '@/lib/finance/formatters';

export const INVOICE_SEND_BLOCKED = new Set(['void', 'cancelled']);

export type InvoiceSendRecipient = {
  email: string;
  fullName: string;
  userId: string | null;
};

export type InvoiceSendHeader = {
  id: string;
  invoice_number: string;
  client_id: string | null;
  quote_id: string | null;
  status: string;
  total_amount: number;
  due_date: string | null;
  sent_at: string | null;
  sent_by: string | null;
  sent_to: string | null;
  send_count: number;
};

export type InvoiceSendStamp = {
  sent_at: string;
  sent_by: string | null;
  sent_to: string;
  send_count: number;
};

export type InvoiceMailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: string; contentType: string }[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Last-send stamp. send_count is previous + 1. sent_at is always `now`. */
export function nextInvoiceSendStamp(input: {
  now: string;
  actorId: string | null;
  sentTo: string;
  previousCount: number;
}): InvoiceSendStamp {
  return {
    sent_at: input.now,
    sent_by: input.actorId,
    sent_to: input.sentTo,
    send_count: input.previousCount + 1,
  };
}

export function invoiceEmailSubject(invoiceNumber: string): string {
  return `Invoice ${invoiceNumber} — Diedericks Dobermanns`;
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`;
}

/**
 * Short body. Bank details live on the PDF only — a settings change must
 * never leave a stale account number in an email template.
 */
export function buildInvoiceEmailHtml(input: {
  fullName: string;
  invoiceNumber: string;
  totalLabel: string;
  dueDateLabel: string;
  hasPortalAccount: boolean;
  invoiceId: string;
  siteUrl: string;
}): string {
  const portal = input.hasPortalAccount
    ? `<p>You can also <a href="${escapeHtml(`${input.siteUrl}/portal/invoices/${input.invoiceId}`)}" style="color:#C4A35A;">open this invoice in your portal</a>.</p>`
    : '';
  return `
      <p>Dear ${escapeHtml(input.fullName)},</p>
      <p>Please find invoice <strong>${escapeHtml(input.invoiceNumber)}</strong> attached.</p>
      <p style="font-size:20px; color:#C4A35A; border-top:1px solid #C4A35A55; padding-top:12px;">
        ${escapeHtml(input.totalLabel)}
      </p>
      <p>Due: ${escapeHtml(input.dueDateLabel)}</p>
      <p>Use <strong>${escapeHtml(input.invoiceNumber)}</strong> as the payment reference.</p>
      ${portal}
      <p>The PDF attached has the banking details for this invoice.</p>
    `;
}

export function invoiceSendSuccessMessage(
  invoiceNumber: string,
  email: string,
  portalNotified: boolean,
): string {
  const base = `Invoice ${invoiceNumber} emailed to ${email}`;
  return portalNotified ? base : `${base}. No portal account — email only.`;
}

/** Second confirm on resend, naming the send count. */
export function invoiceResendConfirmCopy(sendCount: number): string | null {
  if (sendCount <= 0) return null;
  if (sendCount === 1) return 'This invoice has been sent once already. Send again?';
  if (sendCount === 2) return 'This invoice has been sent twice already. Send again?';
  return `This invoice has been sent ${sendCount} times already. Send again?`;
}

export function invoiceSentStateLabel(input: {
  sentAt: string | null;
  sentTo: string | null;
}): string {
  if (!input.sentAt) return 'Not sent yet';
  const when = formatDate(input.sentAt);
  return input.sentTo ? `Sent ${when} to ${input.sentTo}` : `Sent ${when}`;
}

export function invoiceListSentLabel(sentAt: string | null | undefined): string {
  return sentAt ? formatDate(sentAt) : 'Not sent';
}

export function invoiceBlockedReason(status: string): string | null {
  if (INVOICE_SEND_BLOCKED.has(status)) {
    return 'A voided or cancelled invoice cannot be emailed.';
  }
  return null;
}

export function invoiceEmailLabels(header: Pick<InvoiceSendHeader, 'total_amount' | 'due_date'>): {
  totalLabel: string;
  dueDateLabel: string;
} {
  return {
    totalLabel: formatAmount(header.total_amount),
    dueDateLabel: header.due_date ? formatDate(header.due_date) : 'On receipt',
  };
}

export type SendInvoiceTransport = {
  mail: (payload: InvoiceMailPayload) => Promise<{ error: string | null }>;
  notifyPortal: (input: {
    userId: string;
    invoiceId: string;
    invoiceNumber: string;
    totalLabel: string;
  }) => Promise<void>;
  stamp: (
    invoiceId: string,
    patch: InvoiceSendStamp & { status?: string },
  ) => Promise<{ error: string | null }>;
};

export type SendInvoiceResult = {
  error?: string;
  sentTo?: string;
  message?: string;
  stamp?: InvoiceSendStamp;
  portalNotified?: boolean;
  dryRun?: boolean;
  pdfText?: string;
};

/**
 * Email first, stamp only after the transport confirms. dryRun builds the
 * payload and returns the would-be stamp without mailing or writing.
 */
export async function executeInvoiceSend(input: {
  header: InvoiceSendHeader;
  recipient: InvoiceSendRecipient;
  actorId: string | null;
  pdfBase64: string;
  pdfText: string;
  siteUrl: string;
  transport: SendInvoiceTransport;
  now?: string;
  dryRun?: boolean;
}): Promise<SendInvoiceResult> {
  const blocked = invoiceBlockedReason(input.header.status);
  if (blocked) return { error: blocked };

  const hasPortalAccount = Boolean(input.header.client_id);
  const labels = invoiceEmailLabels(input.header);
  const subject = invoiceEmailSubject(input.header.invoice_number);
  const html = buildInvoiceEmailHtml({
    fullName: input.recipient.fullName,
    invoiceNumber: input.header.invoice_number,
    totalLabel: labels.totalLabel,
    dueDateLabel: labels.dueDateLabel,
    hasPortalAccount,
    invoiceId: input.header.id,
    siteUrl: input.siteUrl,
  });
  const stamp = nextInvoiceSendStamp({
    now: input.now ?? new Date().toISOString(),
    actorId: input.actorId,
    sentTo: input.recipient.email,
    previousCount: input.header.send_count ?? 0,
  });

  if (input.dryRun) {
    return {
      dryRun: true,
      sentTo: input.recipient.email,
      stamp,
      portalNotified: hasPortalAccount,
      pdfText: input.pdfText,
      message: invoiceSendSuccessMessage(
        input.header.invoice_number,
        input.recipient.email,
        hasPortalAccount,
      ),
    };
  }

  const { error: mailError } = await input.transport.mail({
    to: input.recipient.email,
    subject,
    html,
    attachments: [
      {
        filename: invoicePdfFilename(input.header.invoice_number),
        content: input.pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  });
  if (mailError) {
    return { error: 'Could not send the invoice by email.' };
  }

  const statusPatch = input.header.status === 'draft' ? { status: 'sent' as const } : {};
  const { error: stampError } = await input.transport.stamp(input.header.id, {
    ...stamp,
    ...statusPatch,
  });
  if (stampError) return { error: stampError };

  let portalNotified = false;
  if (hasPortalAccount && input.header.client_id) {
    await input.transport.notifyPortal({
      userId: input.header.client_id,
      invoiceId: input.header.id,
      invoiceNumber: input.header.invoice_number,
      totalLabel: labels.totalLabel,
    });
    portalNotified = true;
  }

  return {
    sentTo: input.recipient.email,
    stamp,
    portalNotified,
    message: invoiceSendSuccessMessage(
      input.header.invoice_number,
      input.recipient.email,
      portalNotified,
    ),
  };
}
