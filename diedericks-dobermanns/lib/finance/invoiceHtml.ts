import { format, parseISO } from 'date-fns';

import { formatAmountPlain } from '@/lib/finance/formatters';
import type { InvoiceWithDetails } from '@/types/finance';

export type BankingDetails = {
  bank: string;
  accountName: string;
  accountNo: string;
  branch: string;
};

export function buildInvoiceHTML(
  invoice: InvoiceWithDetails,
  banking: BankingDetails,
  logoBase64: string,
): string {
  const itemsHtml = invoice.items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0e8d8;font-size:13px">${i.description}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0e8d8;text-align:center;font-size:13px">${i.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0e8d8;text-align:right;font-size:13px">R ${formatAmountPlain(i.unit_price)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0e8d8;text-align:right;font-size:13px;font-weight:bold">R ${formatAmountPlain(i.line_total)}</td>
    </tr>`,
    )
    .join('');

  const paymentsHtml = (invoice.payments ?? [])
    .map(
      (p) => `
    <tr>
      <td>${p.payment_date}</td>
      <td>${p.payment_method ?? '—'}</td>
      <td>R ${formatAmountPlain(p.amount)}</td>
      <td style="color:#888">${p.reference ?? ''}</td>
    </tr>`,
    )
    .join('');

  const outstanding =
    invoice.amount_outstanding ?? invoice.total_amount - invoice.amount_paid;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fff;
      color: #1a1a1a;
      padding: 48px 56px;
      position: relative;
      min-height: 100vh;
    }
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 420px; height: 420px;
      opacity: 0.04;
      z-index: 0;
    }
    .content { position: relative; z-index: 1; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .logo { width: 72px; height: 72px; object-fit: contain; }
    .brand-name { font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a; }
    .brand-tagline { font-size: 10px; letter-spacing: 1.5px; color: #C4A35A; text-transform: uppercase; margin-top: 2px; }
    .brand-contact { font-size: 11px; color: #666; margin-top: 6px; line-height: 1.6; }
    .gold-line { height: 2px; background: linear-gradient(90deg, #C4A35A, #F0D890, #C4A35A); margin: 16px 0 24px 0; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .invoice-title { font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #1a1a1a; }
    .meta-right { text-align: right; font-size: 12px; color: #444; line-height: 1.8; }
    .meta-right .ref { font-weight: bold; color: #1a1a1a; }
    .bill-to { font-size: 12px; }
    .bill-to .label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #C4A35A; margin-bottom: 4px; }
    table.items { width: 100%; border-collapse: collapse; margin: 24px 0; }
    table.items thead tr { background: #1a1a1a; color: #C4A35A; }
    table.items thead th { padding: 10px 8px; text-align: left; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
    table.items thead th:nth-child(2) { text-align: center; }
    table.items thead th:nth-child(3),
    table.items thead th:nth-child(4) { text-align: right; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals-divider { border-top: 1px solid #ddd; margin: 4px 0; }
    .totals-total { font-size: 15px; font-weight: bold; border-top: 2px solid #C4A35A; border-bottom: 2px solid #C4A35A; padding: 8px 0; color: #1a1a1a; }
    .totals-outstanding { font-size: 15px; font-weight: bold; color: #C0392B; margin-top: 4px; }
    .section-head { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #C4A35A; border-bottom: 1px solid #C4A35A; padding-bottom: 4px; margin: 24px 0 10px 0; }
    table.payments { width: 100%; font-size: 12px; border-collapse: collapse; }
    table.payments td { padding: 5px 4px; border-bottom: 1px solid #f5f5f5; }
    .banking { background: #fafaf7; border: 1px solid #e8dfc8; border-radius: 4px; padding: 12px 16px; font-size: 12px; line-height: 1.9; }
    .banking strong { color: #C4A35A; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    .notes-box { background: #fafaf7; border-left: 3px solid #C4A35A; padding: 10px 14px; font-size: 12px; color: #444; margin-top: 16px; }
  </style>
  </head><body>
  <img class="watermark" src="${logoBase64}" alt="" />
  <div class="content">
    ${letterheadBlock(logoBase64)}
    <div class="invoice-meta">
      <div>
        <div class="invoice-title">INVOICE</div>
        <div style="margin-top:16px" class="bill-to">
          <div class="label">Bill To</div>
          <div style="font-weight:bold;font-size:14px">${invoice.clientName ?? '—'}</div>
          ${invoice.clientEmail ? `<div>${invoice.clientEmail}</div>` : ''}
        </div>
      </div>
      <div class="meta-right">
        <div><span class="ref">${invoice.invoice_number}</span></div>
        <div>Issue date: ${invoice.issue_date}</div>
        <div>Due date: ${invoice.due_date ?? 'On receipt'}</div>
      </div>
    </div>
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>R ${formatAmountPlain(invoice.subtotal)}</span></div>
      ${invoice.discount_amount > 0 ? `<div class="totals-row" style="color:#666"><span>Discount</span><span>− R ${formatAmountPlain(invoice.discount_amount)}</span></div>` : ''}
      <div class="totals-divider"></div>
      <div class="totals-row totals-total"><span>TOTAL</span><span>R ${formatAmountPlain(invoice.total_amount)}</span></div>
      ${invoice.amount_paid > 0 ? `<div class="totals-row" style="color:#27ae60"><span>Paid</span><span>R ${formatAmountPlain(invoice.amount_paid)}</span></div>` : ''}
      ${outstanding > 0 ? `<div class="totals-row totals-outstanding"><span>OUTSTANDING</span><span>R ${formatAmountPlain(outstanding)}</span></div>` : `<div class="totals-row" style="color:#27ae60;font-weight:bold"><span>✓ PAID IN FULL</span><span></span></div>`}
    </div>
    ${(invoice.payments ?? []).length > 0 ? `
    <div class="section-head">Payment History</div>
    <table class="payments">
      ${paymentsHtml}
    </table>` : ''}
    ${invoice.notes ? `<div class="notes-box">${invoice.notes}</div>` : ''}
    <div class="section-head">Banking Details</div>
    <div class="banking">
      <strong>Bank:</strong> ${banking.bank} &nbsp;|&nbsp;
      <strong>Account name:</strong> ${banking.accountName} &nbsp;|&nbsp;
      <strong>Account no:</strong> ${banking.accountNo} &nbsp;|&nbsp;
      <strong>Branch code:</strong> ${banking.branch}<br>
      <strong>Reference:</strong> ${invoice.invoice_number}
    </div>
    <div class="footer">
      <span>Diedericks Dobermanns · This invoice is valid for 30 days from issue date</span>
      <span>Generated ${new Date().toLocaleDateString('en-ZA')} · CONFIDENTIAL</span>
    </div>
  </div>
  </body></html>`;
}

export function letterheadBlock(logoBase64: string): string {
  return `
    <div class="header">
      <div style="display:flex;align-items:center;gap:16px">
        <img class="logo" src="${logoBase64}" alt="Diedericks Dobermanns" />
        <div>
          <div class="brand-name">Diedericks Dobermanns</div>
          <div class="brand-tagline">Born With Purpose. Built With Discipline.</div>
          <div class="brand-contact">
            Tel: +27 XX XXX XXXX<br>
            info@diedericksdobermanns.com<br>
            www.diedericksdobermanns.com
          </div>
        </div>
      </div>
    </div>
    <div class="gold-line"></div>`;
}

export interface StatementRow {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function buildStatementHTML(
  clientName: string,
  clientContact: string | null,
  rows: StatementRow[],
  logoBase64: string,
): string {
  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px">${formatStmtDate(r.date)}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px">${r.reference}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px">${r.description}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;text-align:right">${r.debit > 0 ? `R ${formatAmountPlain(r.debit)}` : ''}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;text-align:right">${r.credit > 0 ? `R ${formatAmountPlain(r.credit)}` : ''}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:bold">R ${formatAmountPlain(r.balance)}</td>
    </tr>`,
    )
    .join('');

  const totalOutstanding = rows.length > 0 ? rows[rows.length - 1].balance : 0;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; background: #fff; color: #1a1a1a; padding: 48px 56px; }
    .logo { width: 72px; height: 72px; object-fit: contain; }
    .brand-name { font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; }
    .brand-tagline { font-size: 10px; letter-spacing: 1.5px; color: #C4A35A; text-transform: uppercase; margin-top: 2px; }
    .brand-contact { font-size: 11px; color: #666; margin-top: 6px; line-height: 1.6; }
    .gold-line { height: 2px; background: linear-gradient(90deg, #C4A35A, #F0D890, #C4A35A); margin: 16px 0 24px 0; }
    .stmt-title { font-size: 24px; letter-spacing: 4px; font-weight: bold; margin-bottom: 8px; }
    .stmt-meta { font-size: 12px; color: #666; margin-bottom: 24px; }
    table.stmt { width: 100%; border-collapse: collapse; margin-top: 16px; }
    table.stmt thead tr { background: #1a1a1a; color: #C4A35A; }
    table.stmt thead th { padding: 8px 4px; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; text-align: left; }
    table.stmt thead th:nth-child(4),
    table.stmt thead th:nth-child(5),
    table.stmt thead th:nth-child(6) { text-align: right; }
    .total-outstanding { margin-top: 24px; text-align: right; font-size: 15px; font-weight: bold; color: #C0392B; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
  </style>
  </head><body>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
    <img class="logo" src="${logoBase64}" alt="" />
    <div>
      <div class="brand-name">Diedericks Dobermanns</div>
      <div class="brand-tagline">Born With Purpose. Built With Discipline.</div>
      <div class="brand-contact">info@diedericksdobermanns.com</div>
    </div>
  </div>
  <div class="gold-line"></div>
  <div class="stmt-title">ACCOUNT STATEMENT</div>
  <div class="stmt-meta">As at: ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
  <div class="stmt-meta"><strong>Client:</strong> ${clientName}${clientContact ? ` — ${clientContact}` : ''}</div>
  <table class="stmt">
    <thead>
      <tr>
        <th>Date</th>
        <th>Reference</th>
        <th>Description</th>
        <th>Debit</th>
        <th>Credit</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="total-outstanding">TOTAL OUTSTANDING: R ${formatAmountPlain(totalOutstanding)}</div>
  <div class="footer">Generated ${new Date().toLocaleDateString('en-ZA')} · CONFIDENTIAL</div>
  </body></html>`;
}

function formatStmtDate(value: string): string {
  try {
    return format(parseISO(value), 'd MMM');
  } catch {
    return value;
  }
}

export function buildStatementRows(
  invoices: Array<{ issue_date: string; invoice_number: string; total_amount: number; notes: string | null }>,
  payments: Array<{
    payment_date: string;
    amount: number;
    reference: string | null;
    invoice_number: string;
  }>,
): StatementRow[] {
  type LedgerEntry = {
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    sortKey: string;
  };

  const entries: LedgerEntry[] = [];

  for (const inv of invoices) {
    entries.push({
      date: inv.issue_date,
      reference: inv.invoice_number,
      description: inv.notes?.trim() || 'Invoice',
      debit: inv.total_amount,
      credit: 0,
      sortKey: `${inv.issue_date}T00-${inv.invoice_number}`,
    });
  }

  for (const pay of payments) {
    entries.push({
      date: pay.payment_date,
      reference: pay.reference ?? `PAY-${pay.invoice_number}`,
      description: 'Payment received',
      debit: 0,
      credit: pay.amount,
      sortKey: `${pay.payment_date}T01-${pay.reference ?? pay.invoice_number}`,
    });
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  let balance = 0;
  return entries.map((e) => {
    balance += e.debit - e.credit;
    return {
      date: e.date,
      reference: e.reference,
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      balance,
    };
  });
}
