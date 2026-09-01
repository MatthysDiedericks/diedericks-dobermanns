import { Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { FinanceYearSelection } from '@/lib/finance/years';

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FinancePeriodChips({
  years,
  selectedYear,
  onSelectYear,
  monthIdx,
  onSelectMonth,
}: {
  years: number[];
  selectedYear: FinanceYearSelection;
  onSelectYear: (year: FinanceYearSelection) => void;
  monthIdx: number;
  onSelectMonth: (idx: number) => void;
}) {
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {years.map((y) => (
          <Pressable
            key={y}
            onPress={() => onSelectYear(y)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              y === selectedYear ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="label">{y}</Typography>
          </Pressable>
        ))}
        <Pressable
          onPress={() => onSelectYear('all')}
          className={`mr-2 rounded-full border px-4 py-2 ${
            selectedYear === 'all' ? 'border-gold bg-gold/15' : 'border-gold/30'
          }`}
        >
          <Typography variant="label">All years</Typography>
        </Pressable>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {MONTHS.map((m, idx) => (
          <Pressable
            key={m}
            onPress={() => onSelectMonth(idx)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              idx === monthIdx ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{m}</Typography>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
