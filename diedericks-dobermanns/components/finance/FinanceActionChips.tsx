import { ActivityIndicator, Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface FinanceActionChipsProps {
  exporting: boolean;
  onLitters: () => void;
  onAssignAccounts: () => void;
  onLinkSales: () => void;
  onConfirmBuyers: () => void;
  onUnrecordedPayments: () => void;
  onSalesInvoices: () => void;
  onPurchaseInvoices: () => void;
  onCashflow: () => void;
  onDebtors: () => void;
  onProofs: () => void;
  onBudget: () => void;
  onRecurring: () => void;
  onRecurringInvoices: () => void;
  onImport: () => void;
  onEmployees: () => void;
  onCash: () => void;
  onReceipts: () => void;
  onReconciliation: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function FinanceActionChips({
  exporting,
  onLitters,
  onAssignAccounts,
  onLinkSales,
  onConfirmBuyers,
  onUnrecordedPayments,
  onSalesInvoices,
  onPurchaseInvoices,
  onCashflow,
  onDebtors,
  onProofs,
  onBudget,
  onRecurring,
  onRecurringInvoices,
  onImport,
  onEmployees,
  onCash,
  onReceipts,
  onReconciliation,
  onExportExcel,
  onExportPdf,
}: FinanceActionChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
      <Pressable onPress={onCash} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Cash on hand</Typography>
      </Pressable>
      <Pressable onPress={onReceipts} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Receipts</Typography>
      </Pressable>
      <Pressable onPress={onReconciliation} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Reconciliation</Typography>
      </Pressable>
      <Pressable onPress={onLitters} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Litter report</Typography>
      </Pressable>
      <Pressable onPress={onAssignAccounts} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Assign accounts</Typography>
      </Pressable>
      <Pressable onPress={onLinkSales} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Link sales</Typography>
      </Pressable>
      <Pressable onPress={onConfirmBuyers} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Confirm buyers</Typography>
      </Pressable>
      <Pressable onPress={onUnrecordedPayments} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Paid with no payment record</Typography>
      </Pressable>
      <Pressable onPress={onSalesInvoices} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Sales invoices</Typography>
      </Pressable>
      <Pressable onPress={onPurchaseInvoices} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Purchase invoices</Typography>
      </Pressable>
      <Pressable onPress={onCashflow} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Cashflow</Typography>
      </Pressable>
      <Pressable onPress={onDebtors} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Debtors</Typography>
      </Pressable>
      <Pressable onPress={onProofs} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Proofs</Typography>
      </Pressable>
      <Pressable onPress={onBudget} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Budget</Typography>
      </Pressable>
      <Pressable onPress={onRecurring} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Recurring expenses</Typography>
      </Pressable>
      <Pressable onPress={onRecurringInvoices} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Recurring invoices</Typography>
      </Pressable>
      <Pressable onPress={onEmployees} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Employees</Typography>
      </Pressable>
      <Pressable onPress={onImport} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Import</Typography>
      </Pressable>
      <Pressable onPress={onExportExcel} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        {exporting ? (
          <ActivityIndicator size="small" color={Colors.gold} />
        ) : (
          <Typography variant="caption">Export Excel</Typography>
        )}
      </Pressable>
      <Pressable onPress={onExportPdf} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Export PDF</Typography>
      </Pressable>
    </ScrollView>
  );
}
