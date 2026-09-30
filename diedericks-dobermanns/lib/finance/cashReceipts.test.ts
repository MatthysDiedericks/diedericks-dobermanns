import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ACCOUNT_REQUIRED,
  applyRevenueBasis,
  basisCaption,
  buildReconciliationSummary,
  cashOnHandTotal,
  clientPortalStatusLabel,
  defaultRevenueBasis,
  invoiceAfterPayment,
  markBanked,
  parseBankCsv,
  paymentReceiptMessage,
  pettyCashAccount,
  resolvePaymentAccount,
  rowsForAccountant,
  statementStoredMessage,
  suggestMatches,
  type PaymentAccountOption,
  type ReceiptAccount,
} from "./cashReceipts";

/** Run: npx tsx --tsconfig tsconfig.json src/lib/finance/cashReceipts.test.ts */

const PETTY: PaymentAccountOption = { id: "petty", name: "Petty Cash", accountType: "cash" };
const STANDARD: PaymentAccountOption = {
  id: "std",
  name: "Standard Bank",
  accountType: "bank",
};
const ACCOUNTS = [PETTY, STANDARD];

function receipt(patch: Partial<ReceiptAccount> = {}): ReceiptAccount {
  return {
    id: "p1",
    accountId: "petty",
    accountName: "Petty Cash",
    accountType: "cash",
    amount: 10000,
    date: "2026-11-04",
    bankedOn: null,
    method: "cash",
    clientName: "Xana Garcia",
    invoiceNumber: "DD-2026-0022",
    ...patch,
  };
}

function sliceView(sql: string, name: string): string {
  const start = sql.indexOf(`-- VIEW:${name}`);
  const end = sql.indexOf(`-- END VIEW:${name}`);
  assert.ok(start >= 0 && end > start, `missing view markers for ${name}`);
  return sql.slice(start, end);
}

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0196_payment_account_and_statements.sql"),
  "utf8",
);

assert.match(migration, /add column if not exists payment_account_id/);
assert.match(migration, /add column if not exists banked_on/);
assert.doesNotMatch(migration, /update\s+(public\.)?invoice_payments\s+set\s+payment_account_id/i);
assert.match(migration, /A payment must name the account that received it/);
assert.match(migration, /'bank-statements',\s*'bank-statements',\s*false/);
assert.match(migration, /notify pgrst, 'reload schema'/);

const paymentView = sliceView(migration, "accountant_payment_register");
assert.match(paymentView, /invoice_payments/);
assert.doesNotMatch(paymentView, /account_type\s*=\s*'bank'/);
assert.doesNotMatch(paymentView, /storage_path/);
assert.doesNotMatch(paymentView, /storage\.objects/);

const statementView = sliceView(migration, "accountant_bank_statements");
assert.match(statementView, /account_type\s*=\s*'bank'/);
assert.doesNotMatch(statementView, /storage_path/);
assert.doesNotMatch(sliceView(migration, "accountant_bank_statement_lines"), /storage_path/);

assert.equal(migration.includes("grant select on public.contacts"), false);
assert.equal(migration.includes("grant select on public.dogs"), false);
assert.match(migration, /bucket_id = 'bank-statements' and public\.is_admin\(\)/);

const missing = resolvePaymentAccount({ method: "eft", accountId: "", accounts: ACCOUNTS });
assert.deepEqual(missing, { error: ACCOUNT_REQUIRED });

const cash = resolvePaymentAccount({ method: "cash", accountId: null, accounts: ACCOUNTS });
assert.deepEqual(cash, { accountId: PETTY.id });
assert.equal(pettyCashAccount(ACCOUNTS)?.name, "Petty Cash");

const named = resolvePaymentAccount({
  method: "eft",
  accountId: STANDARD.id,
  accounts: ACCOUNTS,
});
assert.deepEqual(named, { accountId: STANDARD.id });

const onHand = [
  receipt(),
  receipt({ id: "p2", accountType: "bank", accountId: "std", accountName: "Standard Bank", amount: 500 }),
  receipt({ id: "p3", amount: 2000, bankedOn: "2026-11-05" }),
];
assert.equal(cashOnHandTotal(onHand), 10000);
const banked = markBanked(onHand, ["p1"], "2026-11-06");
assert.equal(banked.find((row) => row.id === "p1")?.bankedOn, "2026-11-06");
assert.equal(cashOnHandTotal(banked), 0);

const settled = invoiceAfterPayment({ total: 10000, paidSoFar: 0, amount: 10000 });
assert.equal(settled.paidInFull, true);
assert.equal(settled.status, "paid");
assert.equal(clientPortalStatusLabel(settled.status), "Paid in full");
assert.equal(
  paymentReceiptMessage({
    amount: 10000,
    method: "cash",
    clientName: "Xana Garcia",
    paidOn: "2026-11-04",
    invoiceNumber: "DD-2026-0022",
    paidInFull: true,
    outstanding: 0,
  }),
  "R10 000 cash received from Xana Garcia, 4 Nov 2026. Invoice DD-2026-0022 is now paid in full.",
);

const partial = invoiceAfterPayment({ total: 15000, paidSoFar: 0, amount: 10000 });
assert.equal(partial.paidInFull, false);
assert.equal(clientPortalStatusLabel(partial.status), "Partly paid");

const book = rowsForAccountant(onHand);
assert.equal(book.length, 3);
assert.ok(book.some((row) => row.accountType === "cash"));
assert.equal(defaultRevenueBasis("accountant"), "bank");
assert.equal(defaultRevenueBasis("admin"), "all");
const bankOnly = applyRevenueBasis(book, "bank");
assert.equal(bankOnly.length, 1);
assert.equal(bankOnly[0]?.accountType, "bank");
assert.match(basisCaption("bank"), /Clear it to see all revenue, cash included/);
assert.equal(applyRevenueBasis(book, "all").filter((row) => row.accountType === "cash").length, 2);
assert.match(basisCaption("all"), /cash included/);

const lines = [
  {
    id: "l-near",
    date: "2026-11-05",
    amount: 1500,
    matchedPaymentId: null,
    matchedExpenseId: null,
  },
  {
    id: "l-far",
    date: "2026-12-20",
    amount: 1500,
    matchedPaymentId: null,
    matchedExpenseId: null,
  },
  {
    id: "l-out",
    date: "2026-11-04",
    amount: -400,
    matchedPaymentId: null,
    matchedExpenseId: null,
  },
];
const payments = [
  {
    id: "pay-bank",
    accountId: "std",
    accountType: "bank",
    date: "2026-11-04",
    amount: 1500,
    label: "EFT",
  },
  {
    id: "pay-cash",
    accountId: "petty",
    accountType: "cash",
    date: "2026-11-04",
    amount: 1500,
    label: "Cash",
  },
];
const expenses = [
  {
    id: "ex1",
    accountId: "std",
    accountType: "bank",
    date: "2026-11-04",
    amount: 400,
    label: "Vet",
  },
];
const suggestions = suggestMatches(lines, payments, expenses);
assert.deepEqual(
  suggestions.map((row) => row.lineId).sort(),
  ["l-near", "l-out"],
);
assert.equal(
  suggestions.find((row) => row.lineId === "l-near")?.paymentId,
  "pay-bank",
);
assert.equal(
  suggestions.some((row) => row.paymentId === "pay-cash"),
  false,
);
assert.equal(
  suggestions.some((row) => row.lineId === "l-far"),
  false,
);

const summary = buildReconciliationSummary({
  lines: [
    { ...lines[0], matchedPaymentId: "pay-bank", matchedExpenseId: null },
    lines[1],
  ],
  payments,
  accountName: "Standard Bank",
  paymentsWithNoAccount: 145,
  cashOnHand: 10000,
});
assert.equal(summary.matchedToPayment, 1);
assert.equal(summary.unmatchedLines, 1);
assert.equal(summary.paymentsNotOnStatement, 0);
assert.equal(summary.paymentsWithNoAccount, 145);
assert.equal(summary.cashOnHand, 10000);
assert.equal(summary.excludesCash, true);
assert.match(summary.scopeNote, /Cash receipts are excluded/);
assert.match(summary.scopeNote, /included in revenue/);

const csv = parseBankCsv(
  "Date,Description,Reference,Debit,Credit\n04/11/2026,Garcia,REF1,,1500.00\n05/11/2026,Vet,REF2,400.00,\n",
);
assert.equal(csv.error, undefined);
assert.equal(csv.lines.length, 2);
assert.equal(csv.lines[0]?.amount, 1500);
assert.equal(csv.lines[1]?.amount, -400);
assert.equal(csv.lines[0]?.transactionDate, "2026-11-04");

const unread = statementStoredMessage("pdf", 0);
assert.match(unread, /not read/);
assert.ok(parseBankCsv("hello").error);

console.log("cashReceipts.test.ts ok");
