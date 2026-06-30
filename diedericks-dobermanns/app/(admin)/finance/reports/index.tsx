import { endOfMonth, endOfQuarter, endOfYear, format, startOfMonth, startOfQuarter, startOfYear, subYears } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useFinanceReport } from '@/hooks/useFinanceReport';
import { exportFinanceExcel } from '@/lib/finance/generateExcel';
import { exportFinancePDF } from '@/lib/finance/generatePDF';
import { formatAmount } from '@/lib/finance/formatters';

type Preset = 'month' | 'quarter' | 'year' | 'last_year' | 'custom';

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'month':
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'quarter':
      return {
        from: format(startOfQuarter(now), 'yyyy-MM-dd'),
        to: format(endOfQuarter(now), 'yyyy-MM-dd'),
      };
    case 'year':
      return {
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'last_year':
      const ly = subYears(now, 1);
      return {
        from: format(startOfYear(ly), 'yyyy-MM-dd'),
        to: format(endOfYear(ly), 'yyyy-MM-dd'),
      };
    default:
      return {
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(endOfYear(now), 'yyyy-MM-dd'),
      };
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
  { key: 'last_year', label: 'Last year' },
  { key: 'custom', label: 'Custom' },
];

export default function FinanceReportsScreen() {
  const [preset, setPreset] = useState<Preset>('year');
  const [customFrom, setCustomFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(endOfYear(new Date()), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo };
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const { loadReport, report, isLoading } = useFinanceReport(from, to);

  useEffect(() => {
    loadReport();
  }, [from, to, loadReport]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const data = report ?? await loadReport();
      if (data) await exportFinancePDF(data);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = report ?? await loadReport();
      if (data) await exportFinanceExcel(data);
    } finally {
      setExporting(false);
    }
  };

  const data = report;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Income statement" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {PRESETS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPreset(p.key)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              preset === p.key ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{p.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {preset === 'custom' ? (
        <View className="mb-4 flex-row gap-3 px-6">
          <View className="flex-1">
            <Input value={customFrom} onChangeText={setCustomFrom} placeholder="From" />
          </View>
          <View className="flex-1">
            <Input value={customTo} onChangeText={setCustomTo} placeholder="To" />
          </View>
        </View>
      ) : null}

      <View className="px-6 pb-12">
        <Card>
          <Typography variant="label" className="text-gold">DIEDERICKS DOBERMANNS</Typography>
          <Typography variant="subtitle" className="mt-2">INCOME STATEMENT</Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            {data?.periodLabel ?? `${from} – ${to}`}
          </Typography>

          <Typography variant="label" className="mt-6 mb-2 text-gold">INCOME</Typography>
          {(data?.incomeLines ?? []).map((line) => (
            <View key={line.label} className="flex-row justify-between py-1 pl-2">
              <Typography variant="body">{line.label}</Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(line.amount)}
              </Typography>
            </View>
          ))}
          <View className="mt-2 flex-row justify-between border-t border-gold/30 pt-2">
            <Typography variant="subtitle">Total income</Typography>
            <Typography variant="label" className="text-gold">
              {formatAmount(data?.totalIncome ?? 0)}
            </Typography>
          </View>

          <Typography variant="label" className="mt-6 mb-2 text-gold">EXPENSES</Typography>
          {(data?.expenseLines ?? []).map((line) => (
            <View key={line.label} className="flex-row justify-between py-1 pl-2">
              <Typography variant="body">{line.label}</Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(line.amount)}
              </Typography>
            </View>
          ))}
          <View className="mt-2 flex-row justify-between border-t border-gold/30 pt-2">
            <Typography variant="subtitle">Total expenses</Typography>
            <Typography variant="label" className="text-gold">
              {formatAmount(data?.totalExpenses ?? 0)}
            </Typography>
          </View>

          <View className="mt-6 flex-row justify-between border-y border-gold/40 py-3">
            <Typography variant="display">Net profit</Typography>
            <Typography variant="display" className="text-gold">
              {formatAmount(data?.netProfit ?? 0)}
            </Typography>
          </View>
          <View className="mt-2 flex-row justify-between">
            <Typography variant="body">Profit margin</Typography>
            <Typography variant="label">
              {(data?.profitMargin ?? 0).toFixed(1)}%
            </Typography>
          </View>
        </Card>

        <View className="mt-6 gap-3">
          <Button
            label="Export PDF"
            onPress={handleExportPdf}
            loading={exporting || isLoading}
            fullWidth
          />
          <Button
            label="Export Excel"
            variant="secondary"
            onPress={handleExportExcel}
            loading={exporting || isLoading}
            fullWidth
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
