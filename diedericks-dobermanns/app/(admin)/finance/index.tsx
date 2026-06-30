import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { ExpenseAllocationBreakdown } from '@/components/finance/ExpenseAllocationBreakdown';
import { FinanceActionChips } from '@/components/finance/FinanceActionChips';
import { FinanceKpiCard } from '@/components/finance/FinanceKpiCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { useExpenseAllocationBreakdown, useVatExpenseSummary } from '@/hooks/useExpenses';
import { useFinanceReport } from '@/hooks/useFinanceReport';
import { buildFinanceReport, yearMonthRange } from '@/lib/finance/queries';
import { exportFinanceExcel } from '@/lib/finance/generateExcel';
import { exportFinancePDF } from '@/lib/finance/generatePDF';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { financeYearRange } from '@/lib/finance/years';

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = financeYearRange();

export default function FinanceDashboardScreen() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthIdx, setMonthIdx] = useState(0);
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(() => {
    if (monthIdx === 0) return yearMonthRange(selectedYear);
    return yearMonthRange(selectedYear, monthIdx - 1);
  }, [selectedYear, monthIdx]);

  const {
    invoices,
    expenses,
    incomeByType,
    monthlySummary,
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    priorPeriodComparison,
    isLoading,
  } = useFinanceReport(from, to);

  const { summary: budgetSummary } = useBudgetSummary(selectedYear);
  const { totalVat } = useVatExpenseSummary(from, to);
  const { breakdown: allocationBreakdown } = useExpenseAllocationBreakdown(from, to);

  const chartWidth = Dimensions.get('window').width - 48;
  const chartConfig = {
    backgroundGradientFrom: Colors.blackRich,
    backgroundGradientTo: Colors.blackRich,
    color: (opacity = 1) => `rgba(196, 163, 90, ${opacity})`,
    labelColor: () => Colors.silver,
    barPercentage: 0.5,
    decimalPlaces: 0,
  };

  const recentInvoices = invoices.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);
  const kpis = priorPeriodComparison;
  const budgetUsedPct = budgetSummary?.budgetUsedPct ?? 0;

  const runExport = async (kind: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const data = await buildFinanceReport(from, to);
      if (kind === 'excel') await exportFinanceExcel(data);
      else await exportFinancePDF(data);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Management" title="Finance" back={false} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {YEARS.map((y) => (
          <Pressable
            key={y}
            onPress={() => setSelectedYear(y)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              y === selectedYear ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="label">{y}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {MONTHS.map((m, idx) => (
          <Pressable
            key={m}
            onPress={() => setMonthIdx(idx)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              idx === monthIdx ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{m}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => router.push('/(admin)/finance/budget' as never)} className="mx-6 mb-4">
        <Card className="flex-row items-center justify-between">
          <View>
            <Typography variant="label" className="text-gold">
              Budget Tracker
            </Typography>
            <Typography variant="caption" className="text-subtle">
              {selectedYear} · Expenses {budgetUsedPct.toFixed(0)}% of budget
            </Typography>
          </View>
          <Typography variant="label" className="text-gold">
            →
          </Typography>
        </Card>
      </Pressable>

      <FinanceActionChips
        exporting={exporting}
        onBudget={() => router.push('/(admin)/finance/budget' as never)}
        onRecurring={() => router.push('/(admin)/finance/expenses/recurring' as never)}
        onImport={() => router.push('/(admin)/finance/import' as never)}
        onExportExcel={() => void runExport('excel')}
        onExportPdf={() => void runExport('pdf')}
      />

      {isLoading ? <CardListSkeleton count={2} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 px-6">
        <FinanceKpiCard
          label="Total income"
          value={formatAmount(totalIncome)}
          delta={kpis?.incomeDeltaPct ?? null}
          subtext="Received"
        />
        <FinanceKpiCard
          label="Total expenses"
          value={formatAmount(totalExpenses)}
          delta={kpis?.expenseDeltaPct ?? null}
          subtext="Paid out"
        />
        <FinanceKpiCard
          label="Net profit"
          value={formatAmount(netProfit)}
          delta={kpis?.profitDeltaPct ?? null}
          subtext="Income − expenses"
          valueClass={netProfit >= 0 ? 'text-gold' : 'text-danger'}
        />
        <FinanceKpiCard
          label="Profit margin"
          value={`${profitMargin.toFixed(1)}%`}
          delta={null}
          subtext="Of income"
          valueClass={profitMargin >= 0 ? 'text-gold' : 'text-danger'}
        />
        <FinanceKpiCard
          label="VAT Paid"
          value={formatAmount(totalVat)}
          delta={null}
          subtext="Input tax — for VAT returns"
        />
      </ScrollView>

      {!isLoading && allocationBreakdown.total > 0 ? (
        <View className="mb-6 px-6">
          <ExpenseAllocationBreakdown breakdown={allocationBreakdown} />
        </View>
      ) : null}

      {!isLoading && monthlySummary.length > 0 ? (
        <View className="mb-6 px-6">
          <SectionHeader title="Income vs expenses" />
          <BarChart
            data={{
              labels: monthlySummary.map((m) => m.month.slice(0, 3)),
              datasets: [
                { data: monthlySummary.map((m) => m.income || 0), color: () => Colors.gold },
                { data: monthlySummary.map((m) => m.expenses || 0), color: () => Colors.danger },
              ],
            }}
            width={chartWidth}
            height={220}
            yAxisLabel="R "
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={{ borderRadius: 8 }}
            fromZero
            showValuesOnTopOfBars={false}
          />
          <Typography variant="caption" className="mt-2 text-subtle">
            Gold = income · Red = expenses
          </Typography>
        </View>
      ) : null}

      {incomeByType.length > 0 ? (
        <View className="mb-6 px-6">
          <SectionHeader title="Income by type" />
          {incomeByType.map((line) => (
            <View key={line.label} className="flex-row justify-between py-2">
              <Typography variant="body">{line.label}</Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(line.amount)}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mb-6 px-6">
        <SectionHeader title="Recent invoices" />
        {recentInvoices.map((inv) => (
          <Pressable
            key={inv.id}
            onPress={() =>
              router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: inv.id } })
            }
          >
            <Card className="mb-2 flex-row items-center justify-between">
              <View className="flex-1">
                <Typography variant="label" className="font-mono text-gold">
                  {inv.invoice_number}
                </Typography>
                <Typography variant="caption">
                  {inv.client?.full_name ?? '—'} · {formatDate(inv.issue_date)}
                </Typography>
              </View>
              <View className="items-end gap-1">
                <Typography variant="label">{formatAmount(inv.total_amount)}</Typography>
                <InvoiceStatusBadge status={inv.status} />
              </View>
            </Card>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/(admin)/finance/invoices/index')}>
          <Typography variant="label" className="text-gold">
            View all invoices →
          </Typography>
        </Pressable>
      </View>

      <View className="mb-24 px-6">
        <SectionHeader title="Recent expenses" />
        {recentExpenses.map((exp) => (
          <Card key={exp.id} className="mb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Typography variant="body" numberOfLines={1}>
                {exp.description}
              </Typography>
              <Typography variant="caption">{exp.categoryName}</Typography>
            </View>
            <Typography variant="label" className="text-gold">
              {formatAmount(exp.amount)}
            </Typography>
          </Card>
        ))}
        <Pressable onPress={() => router.push('/(admin)/finance/expenses/index' as never)}>
          <Typography variant="label" className="text-gold">
            View all expenses →
          </Typography>
        </Pressable>
      </View>

      <View className="absolute bottom-6 right-6 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(admin)/finance/expenses/new')}
          className="rounded-full border border-gold/40 bg-surface px-5 py-3"
        >
          <Typography variant="label">Log expense</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/quotes/new' as never)}
          className="rounded-full border border-gold/40 bg-surface px-5 py-3"
        >
          <Typography variant="label">New Quote</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/finance/invoices/new')}
          className="rounded-full border border-gold bg-gold px-5 py-3 flex-row items-center gap-2"
        >
          <Ionicons name="receipt-outline" size={16} color="#111008" />
          <Typography variant="label" className="text-black-rich">
            New Invoice
          </Typography>
        </Pressable>
      </View>

      <View className="absolute bottom-6 left-6 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(admin)/finance/creditors' as never)}
          className="rounded-full border border-gold/30 bg-black-rich px-4 py-3"
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={Colors.gold} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/finance/reports/index' as never)}
          className="rounded-full border border-gold/30 bg-black-rich px-4 py-3"
        >
          <Ionicons name="document-text-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
