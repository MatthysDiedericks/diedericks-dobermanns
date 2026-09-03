import { ActivityIndicator, Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface FinanceActionChipsProps {
  exporting: boolean;
  onCashflow: () => void;
  onDebtors: () => void;
  onProofs: () => void;
  onBudget: () => void;
  onRecurring: () => void;
  onRecurringInvoices: () => void;
  onImport: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function FinanceActionChips({
  exporting,
  onCashflow,
  onDebtors,
  onProofs,
  onBudget,
  onRecurring,
  onRecurringInvoices,
  onImport,
  onExportExcel,
  onExportPdf,
}: FinanceActionChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
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
