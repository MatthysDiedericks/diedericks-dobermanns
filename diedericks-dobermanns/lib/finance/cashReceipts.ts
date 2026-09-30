/**
 * Cash on hand, payment accounts, and bank reconciliation.
 * Suggestions need the same amount and a date within a few days.
 * Amount alone is never a match. The bookkeeper's revenue list is every
 * receipt — a bank-only view is a filter they can clear, not a hidden query.
 */

export const ACCOUNT_REQUIRED = "Choose the account that received this payment.";
export const PETTY_CASH_NAME = "Petty Cash";
export const MATCH_WINDOW_DAYS = 3;

export type AccountType = "bank" | "card" | "cash" | "other" | "";

export type PaymentAccountOption = {
  id: string;
  name: string;
  accountType: AccountType | string;
};

export type RevenueBasis = "all" | "bank" | "cash" | "unassigned";

export type ReceiptAccount = {
  id: string;
  accountId: string | null;
  accountName: string;
  accountType: string;
  amount: number;
  date: string;
  bankedOn: string | null;
  method: string;
  clientName: string;
  invoiceNumber: string;
};

export type StatementLineInput = {
  id: string;
  date: string;
  amount: number;
  description?: string;
  reference?: string;
  matchedPaymentId: string | null;
  matchedExpenseId: string | null;
};

export type ReconPayment = {
  id: string;
  accountId: string | null;
  accountType: string;
  date: string;
  amount: number;
  label: string;
};

export type ReconExpense = {
  id: string;
  accountId: string | null;
  accountType: string;
  date: string;
  amount: number;
  label: string;
};

export type MatchSuggestion = {
  lineId: string;
  paymentId: string | null;
  expenseId: string | null;
  days: number;
};

export type ReconSummary = {
  matchedToPayment: number;
  unmatchedLines: number;
  paymentsNotOnStatement: number;
  paymentsWithNoAccount: number;
  cashOnHand: number;
  excludesCash: boolean;
  scopeNote: string;
};

export function money(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

export function moneyClose(a: number, b: number): boolean {
  return Math.abs(money(a) - money(b)) <= 0.009;
}

export function pettyCashAccount(
  accounts: PaymentAccountOption[],
): PaymentAccountOption | null {
  return (
    accounts.find(
      (a) =>
        a.accountType === "cash" && a.name.trim().toLowerCase() === PETTY_CASH_NAME.toLowerCase(),
    ) ?? null
  );
}

/** Named account wins. Cash with no choice lands on Petty Cash. Anything else is refused. */
export function resolvePaymentAccount(input: {
  method: string;
  accountId?: string | null;
  accounts: PaymentAccountOption[];
}): { accountId: string } | { error: string } {
  const explicit = input.accountId?.trim() ?? "";
  if (explicit) {
    const found = input.accounts.find((a) => a.id === explicit);
    if (!found) return { error: ACCOUNT_REQUIRED };
    return { accountId: found.id };
  }
  if (input.method === "cash") {
    const petty = pettyCashAccount(input.accounts);
    if (petty) return { accountId: petty.id };
  }
  return { error: ACCOUNT_REQUIRED };
}

export function isCashOnHand(row: {
  accountType: string | null;
  bankedOn: string | null;
}): boolean {
  return row.accountType === "cash" && !row.bankedOn;
}

export function cashOnHandTotal(
  rows: Array<{ amount: number; accountType: string | null; bankedOn: string | null }>,
): number {
  return money(
    rows.filter((row) => isCashOnHand(row)).reduce((sum, row) => sum + Number(row.amount), 0),
  );
}

export function markBanked<T extends { id: string; bankedOn: string | null }>(
  rows: T[],
  ids: string[],
  bankedOn: string,
): T[] {
  const chosen = new Set(ids);
  return rows.map((row) => (chosen.has(row.id) ? { ...row, bankedOn } : row));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatReceiptAmount(amount: number): string {
  const n = money(amount);
  const negative = n < 0;
  const [whole, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const body = frac === "00" ? grouped : `${grouped}.${frac}`;
  return `${negative ? "-" : ""}R${body}`;
}

export function formatReceiptDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function methodWord(method: string): string {
  if (method === "cash") return "cash";
  if (method === "eft") return "EFT";
  if (method === "card") return "card";
  return "payment";
}

export function invoiceAfterPayment(input: {
  total: number;
  paidSoFar: number;
  amount: number;
}): { outstanding: number; paidInFull: boolean; status: "paid" | "partially_paid" } {
  const paid = money(input.paidSoFar + input.amount);
  const outstanding = money(Math.max(0, input.total - paid));
  const paidInFull = money(input.total - paid) <= 0.009;
  return {
    outstanding,
    paidInFull,
    status: paidInFull ? "paid" : "partially_paid",
  };
}

/** What the client sees once the trigger has marked the invoice paid. */
export function clientPortalStatusLabel(status: string): string {
  if (status === "paid") return "Paid in full";
  if (status === "partially_paid") return "Partly paid";
  return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function paymentReceiptMessage(input: {
  amount: number;
  method: string;
  clientName: string;
  paidOn: string;
  invoiceNumber: string;
  paidInFull: boolean;
  outstanding: number;
}): string {
  const who = input.clientName.trim() || "the client";
  const lead = `${formatReceiptAmount(input.amount)} ${methodWord(input.method)} received from ${who}, ${formatReceiptDate(input.paidOn)}. Invoice ${input.invoiceNumber}`;
  if (input.paidInFull) return `${lead} is now paid in full.`;
  return `${lead} has ${formatReceiptAmount(input.outstanding)} outstanding.`;
}

export function accountLabel(name: string, type: string): string {
  if (!name && !type) return "Account not assigned";
  if (type === "cash") return `${name || "Cash"} · cash`;
  if (type === "bank") return `${name || "Bank"} · bank`;
  if (type === "card") return `${name || "Card"} · card`;
  return name || "Account not assigned";
}

/**
 * Every receipt the bookkeeper is shown. This does not drop cash.
 * Role is intentionally unused — hiding revenue from the accountant is not allowed.
 */
export function rowsForAccountant<T>(rows: T[]): T[] {
  return rows;
}

export function defaultRevenueBasis(role: string | null | undefined): RevenueBasis {
  return role === "accountant" ? "bank" : "all";
}

export function applyRevenueBasis<T extends { accountType: string; accountId: string | null }>(
  rows: T[],
  basis: RevenueBasis,
): T[] {
  if (basis === "all") return rows;
  if (basis === "bank") return rows.filter((row) => row.accountType === "bank");
  if (basis === "cash") return rows.filter((row) => row.accountType === "cash");
  return rows.filter((row) => !row.accountId);
}

export function basisCaption(basis: RevenueBasis): string {
  if (basis === "all") return "Totals on all revenue, cash included.";
  if (basis === "bank") {
    return "Totals on bank receipts only. This filter leaves out cash. Clear it to see all revenue, cash included.";
  }
  if (basis === "cash") {
    return "Totals on cash receipts only. Clear the filter to see all revenue, cash included.";
  }
  return "Totals on receipts with no account yet. Clear the filter to see all revenue, cash included.";
}

export function basisTotal<T extends { amount: number }>(rows: T[]): number {
  return money(rows.reduce((sum, row) => sum + Number(row.amount), 0));
}

export type ReceiptSplit = {
  all: number;
  bank: number;
  cash: number;
  unassigned: number;
  unassignedCount: number;
  bankCount: number;
  cashCount: number;
};

/** Bank, cash, and unassigned stay separate. Unassigned is never folded into bank. */
export function splitReceipts<T extends { amount: number; accountType: string; accountId: string | null }>(
  rows: T[],
): ReceiptSplit {
  const bank = applyRevenueBasis(rows, "bank");
  const cash = applyRevenueBasis(rows, "cash");
  const unassigned = applyRevenueBasis(rows, "unassigned");
  return {
    all: basisTotal(rows),
    bank: basisTotal(bank),
    cash: basisTotal(cash),
    unassigned: basisTotal(unassigned),
    unassignedCount: unassigned.length,
    bankCount: bank.length,
    cashCount: cash.length,
  };
}

/** Income bars for one calendar year. `all` is not used here — the headline chart keeps invoice receipts. */
export function receiptIncomeByMonth<
  T extends { paymentDate: string; amount: number; accountType: string; accountId: string | null },
>(rows: T[], year: number, basis: Exclude<RevenueBasis, "all">): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const row of applyRevenueBasis(rows, basis)) {
    if (!row.paymentDate.startsWith(`${year}-`)) continue;
    const month = Number(row.paymentDate.slice(5, 7)) - 1;
    if (month < 0 || month > 11) continue;
    months[month] = money(months[month]! + Number(row.amount));
  }
  return months;
}

function utcDay(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function daysApart(a: string, b: string): number {
  const left = utcDay(a);
  const right = utcDay(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.NaN;
  return Math.abs(Math.round((left - right) / 86_400_000));
}

/**
 * A suggestion is the same amount and a date within MATCH_WINDOW_DAYS.
 * Same amount on its own, or a missing date, produces nothing.
 */
export function suggestMatches(
  lines: StatementLineInput[],
  payments: ReconPayment[],
  expenses: ReconExpense[],
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  for (const line of lines) {
    if (line.matchedPaymentId || line.matchedExpenseId) continue;
    if (line.amount > 0) {
      for (const payment of payments) {
        if (payment.accountType !== "bank") continue;
        if (!moneyClose(line.amount, payment.amount)) continue;
        const days = daysApart(line.date, payment.date);
        if (!Number.isFinite(days) || days > MATCH_WINDOW_DAYS) continue;
        suggestions.push({
          lineId: line.id,
          paymentId: payment.id,
          expenseId: null,
          days,
        });
      }
    } else if (line.amount < 0) {
      for (const expense of expenses) {
        if (expense.accountType !== "bank") continue;
        if (!moneyClose(Math.abs(line.amount), expense.amount)) continue;
        const days = daysApart(line.date, expense.date);
        if (!Number.isFinite(days) || days > MATCH_WINDOW_DAYS) continue;
        suggestions.push({
          lineId: line.id,
          paymentId: null,
          expenseId: expense.id,
          days,
        });
      }
    }
  }
  return suggestions;
}

export function buildReconciliationSummary(input: {
  lines: StatementLineInput[];
  payments: ReconPayment[];
  accountName: string;
  paymentsWithNoAccount: number;
  cashOnHand: number;
}): ReconSummary {
  const bankPayments = input.payments.filter((payment) => payment.accountType === "bank");
  const matchedPaymentIds = new Set(
    input.lines.map((line) => line.matchedPaymentId).filter((id): id is string => Boolean(id)),
  );
  return {
    matchedToPayment: input.lines.filter((line) => Boolean(line.matchedPaymentId)).length,
    unmatchedLines: input.lines.filter(
      (line) => !line.matchedPaymentId && !line.matchedExpenseId,
    ).length,
    paymentsNotOnStatement: bankPayments.filter((payment) => !matchedPaymentIds.has(payment.id))
      .length,
    paymentsWithNoAccount: input.paymentsWithNoAccount,
    cashOnHand: money(input.cashOnHand),
    excludesCash: true,
    scopeNote: `This reconciliation is for ${input.accountName}. Cash receipts are excluded — they stay in cash on hand until banked, and they are still included in revenue.`,
  };
}

export type ParsedStatementLine = {
  transactionDate: string;
  description: string;
  reference: string;
  amount: number;
};

function headerIndex(headers: string[], names: string[]): number {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return headers.findIndex((header) => wanted.has(header.trim().toLowerCase()));
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseAmountToken(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/[R$]/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  let normalised = trimmed;
  const lastComma = normalised.lastIndexOf(",");
  const lastDot = normalised.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) normalised = normalised.replace(/\./g, "").replace(",", ".");
    else normalised = normalised.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = normalised.length - lastComma - 1;
    normalised = decimals === 2 ? normalised.replace(",", ".") : normalised.replace(/,/g, "");
  }
  const value = Number(normalised);
  return Number.isFinite(value) ? money(value) : null;
}

function parseDateToken(raw: string): string | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(value);
  if (!dmy) return null;
  const day = dmy[1].padStart(2, "0");
  const month = dmy[2].padStart(2, "0");
  return `${dmy[3]}-${month}-${day}`;
}

export function parseBankCsv(text: string): { lines: ParsedStatementLine[]; error?: string } {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { lines: [], error: "This CSV has no transaction rows. Lines were not imported." };
  }
  const headers = rows[0];
  const dateIdx = headerIndex(headers, ["date", "transaction date", "trans date", "value date"]);
  const descIdx = headerIndex(headers, ["description", "narrative", "details", "transaction"]);
  const refIdx = headerIndex(headers, ["reference", "ref", "reference number"]);
  const amountIdx = headerIndex(headers, ["amount", "value"]);
  const debitIdx = headerIndex(headers, ["debit", "withdrawal", "money out"]);
  const creditIdx = headerIndex(headers, ["credit", "deposit", "money in"]);
  if (dateIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    return {
      lines: [],
      error: "This CSV does not have a date and an amount column. Lines were not imported.",
    };
  }
  const lines: ParsedStatementLine[] = [];
  for (const row of rows.slice(1)) {
    const date = parseDateToken(row[dateIdx] ?? "");
    if (!date) continue;
    let amount: number | null = null;
    if (amountIdx >= 0) amount = parseAmountToken(row[amountIdx] ?? "");
    if (amount == null && (debitIdx >= 0 || creditIdx >= 0)) {
      const debit = debitIdx >= 0 ? parseAmountToken(row[debitIdx] ?? "") : null;
      const credit = creditIdx >= 0 ? parseAmountToken(row[creditIdx] ?? "") : null;
      if (credit && credit !== 0) amount = Math.abs(credit);
      else if (debit && debit !== 0) amount = -Math.abs(debit);
    }
    if (amount == null) continue;
    lines.push({
      transactionDate: date,
      description: descIdx >= 0 ? (row[descIdx] ?? "") : "",
      reference: refIdx >= 0 ? (row[refIdx] ?? "") : "",
      amount,
    });
  }
  if (!lines.length) {
    return { lines: [], error: "No dated amounts could be read from this CSV." };
  }
  return { lines };
}

export function statementStoredMessage(kind: "pdf" | "csv", lineCount: number): string {
  if (kind === "pdf") {
    return "PDF stored. It was not read. Enter the lines, or import a CSV later.";
  }
  return `CSV stored. ${lineCount} line${lineCount === 1 ? "" : "s"} imported.`;
}
