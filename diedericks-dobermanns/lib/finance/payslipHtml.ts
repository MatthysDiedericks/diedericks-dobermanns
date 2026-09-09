import { formatDate } from '@/lib/finance/formatters';
import {
  formatPayslipAmount,
  payslipCurrencyLabel,
} from '@/lib/finance/payslip';
import type { Employee, Payslip } from '@/types/employees';

export function buildPayslipHtml(
  employee: Employee,
  payslip: Payslip,
  company: { name: string; address: string | null },
): string {
  const currency = employee.currency || payslip.currency || 'SZL';
  const money = (n: number) => formatPayslipAmount(n, currency);
  const deductions = payslip.deductions.filter((d) => d.label && d.amount > 0);
  const deductionRows = deductions
    .map(
      (d) =>
        `<tr><td>${escapeHtml(d.label)}</td><td class="num">${money(d.amount)}</td></tr>`,
    )
    .join('');
  const address = (company.address ?? '')
    .split(/\r?\n/)
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join('<br/>');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Georgia, serif; color: #1a1a1a; padding: 28px; }
  h1 { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
  h2 { font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: #C4A35A; }
  .muted { color: #666; font-size: 12px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 6px 0; font-size: 13px; }
  .num { text-align: right; }
  .net { font-size: 16px; font-weight: bold; color: #C4A35A; border-top: 2px solid #C4A35A; padding-top: 8px; }
</style></head><body>
  <h1>${escapeHtml(company.name)}</h1>
  ${address ? `<p class="muted">${address}</p>` : ''}
  <h2>Payslip · ${payslipCurrencyLabel(currency)}</h2>
  <p><strong>${escapeHtml(employee.full_name)}</strong>${
    employee.job_title ? `<br/>${escapeHtml(employee.job_title)}` : ''
  }</p>
  <p class="muted">Period ${formatDate(payslip.period_start)} – ${formatDate(payslip.period_end)}<br/>
  Payment date ${formatDate(payslip.payment_date)}</p>
  ${payslip.rate_of_pay != null ? `<p>Rate of pay ${money(payslip.rate_of_pay)}</p>` : ''}
  ${payslip.hours_worked != null ? `<p>Hours worked ${payslip.hours_worked}</p>` : ''}
  <div class="row"><span>Gross pay</span><span>${money(payslip.gross)}</span></div>
  ${
    deductions.length
      ? `<table>${deductionRows}</table>`
      : ''
  }
  <div class="row net"><span>Net paid</span><span>${money(payslip.net)}</span></div>
  ${
    payslip.employer_enpf != null && payslip.employer_enpf > 0
      ? `<p class="muted">Employer ENPF (employer cost — not deducted from net): ${money(payslip.employer_enpf)}</p>`
      : ''
  }
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
