import { ActivityIndicator, Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface FinanceActionChipsProps {
  exporting: boolean;
  onBudget: () => void;
  onRecurring: () => void;
  onImport: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function FinanceActionChips({
  exporting,
  onBudget,
  onRecurring,
  onImport,
  onExportExcel,
  onExportPdf,
}: FinanceActionChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
      <Pressable onPress={onBudget} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Budget</Typography>
      </Pressable>
      <Pressable onPress={onRecurring} className="mr-2 rounded-full border border-gold/30 px-4 py-2">
        <Typography variant="caption">Recurring</Typography>
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
