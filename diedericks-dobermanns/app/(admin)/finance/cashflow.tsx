import { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useCashflowSummary } from '@/hooks/useCashflowSummary';
import { currentMonthKey, formatZar, horizonKeys } from '@/lib/finance/cashflow/format';

export default function CashflowScreen() {
  const [horizon, setHorizon] = useState<6 | 12>(6);
  const { model, loading, error, refresh } = useCashflowSummary(horizon);
  const thisKey = currentMonthKey();
  const chartWidth = Dimensions.get('window').width - 48;

  const trend = model
    ? model.months.filter((m) => horizonKeys(thisKey, horizon).includes(m.key)).slice(0, 6)
    : [];

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Cashflow" />

      <View className="mb-4 flex-row px-6">
        {([6, 12] as const).map((h) => (
          <Pressable
            key={h}
            onPress={() => setHorizon(h)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              horizon === h ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{h} months</Typography>
          </Pressable>
        ))}
      </View>

      {loading ? <CardListSkeleton count={2} /> : null}

      {!loading && error ? (
        <Pressable onPress={() => void refresh()} className="mx-6 mb-4">
          <Card className="border-danger/40 bg-danger/10">
            <Typography variant="label" className="text-danger">
              Cashflow failed to load
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              {error} · Tap to retry
            </Typography>
          </Card>
        </Pressable>
      ) : null}

      {model ? (
        <>
          <Card className="mx-6 mb-3">
            <Typography variant="caption">Deposits held</Typography>
            <Typography variant="displayLg" className="mt-1 text-gold">
              {formatZar(model.summary.depositsHeld)}
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              How much of the cash in the bank already has a puppy attached to it. Not an income
              adjustment.
            </Typography>
          </Card>

          <View className="mb-4 px-6">
            <Card className="mb-3">
              <Typography variant="caption">Received this month</Typography>
              <Typography variant="title" className="mt-1 text-gold">
                {formatZar(model.summary.receivedThisMonth)}
              </Typography>
            </Card>
            <Card className="mb-3">
              <Typography variant="caption">Expected next 30 days</Typography>
              <Typography variant="title" className="mt-1 text-gold">
                {formatZar(model.summary.expectedNext30)}
              </Typography>
              <Typography variant="caption" className="mt-1 text-subtle">
                Forecast — not mixed with cash received
              </Typography>
            </Card>
            <Card className="mb-3">
              <Typography variant="caption">Net this month</Typography>
              <Typography variant="title" className="mt-1 text-gold">
                {formatZar(model.summary.netThisMonth)}
              </Typography>
            </Card>
            {model.summary.trough ? (
              <Card>
                <Typography variant="caption">Forecast trough</Typography>
                <Typography variant="title" className="mt-1 text-gold">
                  {formatZar(model.summary.trough.depth)}
                </Typography>
                <Typography variant="caption" className="mt-1 text-subtle">
                  Lowest cumulative forecast net · {model.summary.trough.key}
                </Typography>
              </Card>
            ) : null}
          </View>

          {trend.length > 0 ? (
            <View className="mb-8 px-6">
              <Typography variant="label" className="mb-2">
                Monthly received (actual)
              </Typography>
              <BarChart
                data={{
                  labels: trend.map((m) => m.label.split(' ')[0] ?? m.key),
                  datasets: [{ data: trend.map((m) => Math.round(Math.max(0, m.actualIn))) }],
                }}
                width={chartWidth}
                height={220}
                yAxisLabel="R"
                yAxisSuffix=""
                fromZero
                chartConfig={{
                  backgroundGradientFrom: Colors.blackRich,
                  backgroundGradientTo: Colors.blackRich,
                  color: (opacity = 1) => `rgba(196, 163, 90, ${opacity})`,
                  labelColor: () => Colors.silver,
                  barPercentage: 0.5,
                  decimalPlaces: 0,
                }}
                style={{ borderRadius: 8 }}
              />
              <Typography variant="caption" className="mt-2 text-subtle">
                Actual cash in less cash out. Open the website for forecast, drill-through and CSV.
              </Typography>
              {trend.map((m) => (
                <View key={m.key} className="mt-2 flex-row justify-between">
                  <Typography variant="caption">{m.label}</Typography>
                  <Typography variant="caption" className="text-gold">
                    {formatZar(m.actualNet)}
                  </Typography>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}
