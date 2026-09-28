import assert from 'node:assert/strict';

import { bankBlocksFromSettings, formatBankBlocksText } from './bankDetails';
import { buildInvoiceHTML } from './invoiceHtml';
import {
  buildInvoiceEmailHtml,
  executeInvoiceSend,
  invoiceEmailSubject,
  invoiceListSentLabel,
  invoiceResendConfirmCopy,
  invoiceSentStateLabel,
  nextInvoiceSendStamp,
  type InvoiceMailPayload,
  type InvoiceSendHeader,
  type InvoiceSendStamp,
  type SendInvoiceTransport,
} from './sendInvoice';
import type { InvoiceWithDetails } from '../../types/finance';

/** Run: npx tsx lib/finance/sendInvoice.test.ts */

const SETTINGS: Record<string, string> = {
  bank_account_name: 'MR M DIEDERICKS',
  bank_account_number: '27 311 907 9',
  bank_name: 'Standard Bank',
  bank_branch_code: '2749',
  bank_swift: 'SBZAZAJJ',
  bank_intl_enabled: 'true',
  bank_intl_account_name: 'MATTHYS DIEDERICKS',
  bank_intl_account_number: '16916528231',
  bank_intl_bank_name: 'Discovery Bank',
  bank_intl_branch_code: '679000',
  bank_intl_swift: 'DISCZAJJXXX',
  bank_intl_address: '15 Ferreira Street, Nelspruit, 1200',
  bank_intl_branch_name: 'Nelspruit',
  bank_intl_account_type: 'Gold Credit Card',
  bank_intl_label: 'International & SADC clients',
};

function header(patch: Partial<InvoiceSendHeader> = {}): InvoiceSendHeader {
  return {
    id: 'inv-1',
    invoice_number: 'DD-1170',
    client_id: 'client-1',
    quote_id: 'quote-1',
    status: 'draft',
    total_amount: 12500,
    due_date: '2026-10-01',
    sent_at: null,
    sent_by: null,
    sent_to: null,
    send_count: 0,
    ...patch,
  };
}

function invoiceDetail(): InvoiceWithDetails {
  return {
    id: 'inv-1',
    invoice_number: 'DD-1170',
    client_id: 'client-1',
    reservation_id: null,
    dog_id: null,
    litter_id: null,
    status: 'draft',
    issue_date: '2026-09-18',
    due_date: '2026-10-01',
    subtotal: 12500,
    discount_amount: 0,
    total_amount: 12500,
    amount_paid: 0,
    amount_outstanding: 12500,
    paid_date: null,
    notes: null,
    internal_notes: null,
    currency: 'ZAR',
    created_at: '2026-09-18T08:00:00.000Z',
    updated_at: '2026-09-18T08:00:00.000Z',
    clientName: 'Xana Test',
    clientEmail: 'xana@gmail.com',
    clientCountry: 'Namibia',
    items: [
      {
        id: 'item-1',
        invoice_id: 'inv-1',
        description: 'Deposit',
        item_type: 'deposit',
        quantity: 1,
        unit_price: 12500,
        line_total: 12500,
        sort_order: 0,
      },
    ],
    payments: [],
  };
}

function memoryTransport(opts?: { mailError?: string | null }): SendInvoiceTransport & {
  mails: InvoiceMailPayload[];
  stamps: Array<InvoiceSendStamp & { status?: string; id: string }>;
  notifies: Array<{ userId: string; invoiceId: string }>;
} {
  const mails: InvoiceMailPayload[] = [];
  const stamps: Array<InvoiceSendStamp & { status?: string; id: string }> = [];
  const notifies: Array<{ userId: string; invoiceId: string }> = [];
  return {
    mails,
    stamps,
    notifies,
    mail: async (payload) => {
      if (opts?.mailError) return { error: opts.mailError };
      mails.push(payload);
      return { error: null };
    },
    notifyPortal: async (input) => {
      notifies.push({ userId: input.userId, invoiceId: input.invoiceId });
    },
    stamp: async (id, patch) => {
      stamps.push({ id, ...patch });
      return { error: null };
    },
  };
}

async function main() {
  const first = nextInvoiceSendStamp({
    now: '2026-09-18T10:00:00.000Z',
    actorId: 'admin-1',
    sentTo: 'xana@gmail.com',
    previousCount: 0,
  });
  assert.equal(first.send_count, 1);

  const second = nextInvoiceSendStamp({
    now: '2026-09-19T10:00:00.000Z',
    actorId: 'admin-1',
    sentTo: 'xana@gmail.com',
    previousCount: 1,
  });
  assert.equal(second.send_count, 2);
  assert.notEqual(second.sent_at, first.sent_at);

  assert.equal(invoiceEmailSubject('DD-1170'), 'Invoice DD-1170 — Diedericks Dobermanns');
  assert.equal(invoiceSentStateLabel({ sentAt: null, sentTo: null }), 'Not sent yet');
  assert.equal(invoiceListSentLabel(null), 'Not sent');
  assert.equal(
    invoiceResendConfirmCopy(2),
    'This invoice has been sent twice already. Send again?',
  );

  const html = buildInvoiceEmailHtml({
    fullName: 'Xana',
    invoiceNumber: 'DD-1170',
    totalLabel: 'R 12,500.00',
    dueDateLabel: '1 Oct 2026',
    hasPortalAccount: false,
    invoiceId: 'inv-1',
    siteUrl: 'https://diedericksdobermanns.com',
  });
  assert.equal(html.includes('16916528231'), false);
  assert.equal(html.includes('Nelspruit'), false);
  assert.equal(html.includes('/portal/invoices/'), false);

  const blocks = bankBlocksFromSettings('Namibia', SETTINGS);
  const pdfHtml = buildInvoiceHTML(invoiceDetail(), blocks, '');
  assert.match(pdfHtml, /16916528231/);
  assert.match(pdfHtml, /Nelspruit/);
  assert.match(formatBankBlocksText(blocks, 'DD-1170'), /15 Ferreira Street, Nelspruit, 1200/);

  const ok = memoryTransport();
  const sent = await executeInvoiceSend({
    header: header(),
    recipient: { email: 'xana@gmail.com', fullName: 'Xana', userId: 'client-1' },
    actorId: 'admin-1',
    pdfBase64: 'cGRm',
    pdfText: formatBankBlocksText(blocks, 'DD-1170'),
    siteUrl: 'https://diedericksdobermanns.com',
    now: '2026-09-18T10:00:00.000Z',
    transport: ok,
  });
  assert.equal(ok.stamps[0].send_count, 1);
  assert.equal(ok.stamps[0].sent_at, '2026-09-18T10:00:00.000Z');
  assert.equal(ok.stamps[0].sent_by, 'admin-1');
  assert.equal(ok.stamps[0].sent_to, 'xana@gmail.com');
  assert.equal(ok.notifies.length, 1);
  assert.equal(sent.message, 'Invoice DD-1170 emailed to xana@gmail.com');

  const again = memoryTransport();
  const resent = await executeInvoiceSend({
    header: header({ status: 'sent', sent_at: first.sent_at, send_count: 1 }),
    recipient: { email: 'xana@gmail.com', fullName: 'Xana', userId: 'client-1' },
    actorId: 'admin-1',
    pdfBase64: 'cGRm',
    pdfText: '',
    siteUrl: 'https://diedericksdobermanns.com',
    now: '2026-09-19T10:00:00.000Z',
    transport: again,
  });
  assert.equal(resent.stamp?.send_count, 2);
  assert.equal(resent.stamp?.sent_at, '2026-09-19T10:00:00.000Z');

  const noClient = memoryTransport();
  const emailedOnly = await executeInvoiceSend({
    header: header({ client_id: null }),
    recipient: { email: 'xana@gmail.com', fullName: 'Xana', userId: null },
    actorId: 'admin-1',
    pdfBase64: 'cGRm',
    pdfText: '',
    siteUrl: 'https://diedericksdobermanns.com',
    transport: noClient,
  });
  assert.equal(noClient.notifies.length, 0);
  assert.match(emailedOnly.message ?? '', /No portal account — email only/);

  const fail = memoryTransport({ mailError: 'transport down' });
  const failed = await executeInvoiceSend({
    header: header(),
    recipient: { email: 'xana@gmail.com', fullName: 'Xana', userId: 'client-1' },
    actorId: 'admin-1',
    pdfBase64: 'cGRm',
    pdfText: '',
    siteUrl: 'https://diedericksdobermanns.com',
    transport: fail,
  });
  assert.equal(failed.error, 'Could not send the invoice by email.');
  assert.equal(fail.stamps.length, 0);
  assert.equal(fail.notifies.length, 0);

  console.log('sendInvoice.test.ts: all assertions passed');
}

void main();
