import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';

import { FunnelPanel } from '@/components/applications/ApplicationFunnel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import {
  useAdminApplications,
  useAdminDogs,
  useAdminLitters,
  useClients,
} from '@/hooks/useAdmin';
import { useApplicationFunnel } from '@/hooks/useApplicationFunnel';
import { useWebsiteTraffic } from '@/hooks/useWebsiteTraffic';
import {
  formatChange,
  formatConversion,
  formatConversionShort,
  type AnalyticsPreset,
  type ComparedPeriod,
  type SummaryLine,
} from '@/lib/analytics/compare';
import { titleCase } from '@/lib/format';

function countBy<T>(rows: T[], key: (row: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function Breakdown({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, n]) => n));
  return (
    <View className="mb-8 px-6">
      <SectionHeader eyebrow="Breakdown" title={title} />
      <Card>
        {data.length === 0 ? (
          <Typography variant="bodyMuted">No data.</Typography>
        ) : (
          data.map(([label, value], i) => (
            <View key={label} className={i < data.length - 1 ? 'mb-3' : ''}>
              <View className="mb-1 flex-row justify-between">
                <Typography variant="body">{titleCase(label)}</Typography>
                <Typography variant="subtitle" className="text-gold">
                  {value}
                </Typography>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-surface">
                <View
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function SummarySentence({ line }: { line: SummaryLine }) {
  const visitorsWord = line.visitors === 1 ? 'visitor' : 'visitors';
  const appsWord = line.applications === 1 ? 'application' : 'applications';
  const conversion =
    line.conversionPct != null ? ` — ${formatConversionShort(line.conversionPct)}` : '';
  const comparison =
    line.direction && line.priorMonthName
      ? line.direction === 'same'
        ? `, the same as ${line.priorMonthName}`
        : `, ${line.direction} from ${formatConversionShort(line.priorConversionPct)} in ${line.priorMonthName}`
      : '';
  return (
    <Typography variant="body" className="mb-4">
      This month {line.visitors} {visitorsWord} have produced {line.applications} {appsWord}
      {conversion}
      {comparison}.
    </Typography>
  );
}

function CompareStat({
  label,
  value,
  prior,
  change,
  colourChange,
}: {
  label: string;
  value: string;
  prior: string | null;
  change: number | null;
  colourChange?: boolean;
}) {
  const changeClass =
    colourChange && change != null && change > 0
      ? 'text-success'
      : colourChange && change != null && change < 0
        ? 'text-danger'
        : '';
  return (
    <Card className="mb-3 flex-1">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="display" className="mt-1 text-gold">
        {value}
      </Typography>
      <Typography variant="caption" className="mt-1">
        {prior != null ? `was ${prior}` : 'no prior period'}
      </Typography>
      {change != null ? (
        <Typography variant="caption" className={`mt-1 ${changeClass}`}>
          {formatChange(change)}
        </Typography>
      ) : null}
    </Card>
  );
}

function ComparedBlock({ period }: { period: ComparedPeriod }) {
  return (
    <View className="mb-6 px-6">
      <SectionHeader eyebrow="Comparison" title={period.label} />
      <Typography variant="caption" className="mb-3">
        {period.caption}
      </Typography>
      <View className="flex-row gap-3">
        <CompareStat
          label="Visitors"
          value={String(period.current.visitors)}
          prior={period.prior ? String(period.prior.visitors) : null}
          change={period.visitorsChangePct}
          colourChange
        />
        <CompareStat
          label="Views"
          value={String(period.current.views)}
          prior={period.prior ? String(period.prior.views) : null}
          change={period.viewsChangePct}
        />
      </View>
      <View className="flex-row gap-3">
        <CompareStat
          label="Applications"
          value={String(period.current.applications)}
          prior={period.prior ? String(period.prior.applications) : null}
          change={period.applicationsChangePct}
        />
        <CompareStat
          label="Conversion"
          value={formatConversion(period.current.conversionPct)}
          prior={period.prior ? formatConversion(period.prior.conversionPct) : null}
          change={period.conversionChangePct}
        />
      </View>
    </View>
  );
}

function PeriodChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active ? 'rounded-full bg-gold px-3 py-1' : 'rounded-full border border-gold/30 px-3 py-1'
      }
    >
      <Typography variant="caption" className={active ? 'text-black' : 'text-gold'}>
        {label}
      </Typography>
    </Pressable>
  );
}

export default function AdminAnalyticsScreen() {
  const { data: dogs, refetch: refetchDogs } = useAdminDogs();
  const { data: applications, refetch: refetchApps } = useAdminApplications();
  const { data: litters, refetch: refetchLitters } = useAdminLitters();
  const { data: clients, refetch: refetchClients } = useClients();
  const [preset, setPreset] = useState<Exclude<AnalyticsPreset, 'custom'>>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedCustom, setAppliedCustom] = useState<{ from: string; to: string } | null>(null);
  const {
    data: traffic,
    loading: trafficLoading,
    error: trafficError,
    refresh: refreshTraffic,
  } = useWebsiteTraffic(
    appliedCustom
      ? { from: appliedCustom.from, to: appliedCustom.to }
      : { period: preset },
  );
  const funnel = useApplicationFunnel(traffic.selected.from || undefined, traffic.selected.to || undefined);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDogs?.(),
      refetchApps?.(),
      refetchLitters?.(),
      refetchClients?.(),
      refreshTraffic(),
      funnel.refresh(),
    ]);
    setRefreshing(false);
  }, [refetchDogs, refetchApps, refetchLitters, refetchClients, refreshTraffic, funnel]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C4A35A" />}
    >
      <PageHeader eyebrow="Insights" title="Analytics" />

      <View className="mb-2 px-6">
        <SectionHeader eyebrow="Website" title="Website traffic" />
        <Typography variant="bodyMuted" className="mb-4">
          Public site only. Crawlers excluded. A visitor counts once per day.
        </Typography>
      </View>

      {trafficLoading && !traffic.hasAnyData ? (
        <View className="mb-8 items-center px-6 py-6">
          <ActivityIndicator color="#C4A35A" />
        </View>
      ) : trafficError ? (
        <View className="mb-8 px-6">
          <Card>
            <Typography variant="bodyMuted">{trafficError}</Typography>
          </Card>
        </View>
      ) : !traffic.hasAnyData ? (
        <View className="mb-8 px-6">
          <Card>
            <Typography variant="body">
              Nothing recorded yet. Counting starts from the moment the website deploys with
              ANALYTICS_SALT set.
            </Typography>
          </Card>
        </View>
      ) : (
        <>
          <View className="px-6">
            <SummarySentence line={traffic.summary} />
          </View>
          <ComparedBlock period={traffic.monthToDate} />
          <ComparedBlock period={traffic.yearToDate} />

          <View className="mb-8 px-6">
            <SectionHeader eyebrow="Conversion" title="By month" />
            <Card>
              {traffic.months.map((row) => (
                <View key={row.monthKey} className="mb-3 border-b border-gold/10 pb-3">
                  <View className="flex-row justify-between">
                    <Typography variant="body">
                      {row.label}
                      {row.inProgress ? ' · in progress' : ''}
                    </Typography>
                    <Typography variant="subtitle" className="text-gold">
                      {formatConversion(row.conversionPct)}
                    </Typography>
                  </View>
                  <Typography variant="caption">
                    {row.visitors} visitors · {row.applications} applications ·{' '}
                    {formatChange(row.vsPriorPct)} vs prior month
                  </Typography>
                </View>
              ))}
            </Card>
          </View>

          <View className="mb-4 px-6">
            <SectionHeader eyebrow="Period" title="Funnel and sources" />
            <Typography variant="caption" className="mb-3">
              {traffic.selected.label}
            </Typography>
            <View className="mb-3 flex-row flex-wrap gap-2">
              <PeriodChip
                label="Month to date"
                active={!appliedCustom && preset === 'mtd'}
                onPress={() => {
                  setAppliedCustom(null);
                  setPreset('mtd');
                }}
              />
              <PeriodChip
                label="Since tracking began"
                active={!appliedCustom && preset === 'ytd'}
                onPress={() => {
                  setAppliedCustom(null);
                  setPreset('ytd');
                }}
              />
              <PeriodChip
                label="Last 30 days"
                active={!appliedCustom && preset === '30d'}
                onPress={() => {
                  setAppliedCustom(null);
                  setPreset('30d');
                }}
              />
            </View>
            <DateField
              label="From"
              value={customFrom || traffic.selected.from}
              onChange={setCustomFrom}
            />
            <DateField
              label="To"
              value={customTo || traffic.selected.to}
              onChange={setCustomTo}
            />
            <Pressable
              onPress={() => {
                const from = customFrom || traffic.selected.from;
                const to = customTo || traffic.selected.to;
                if (from && to) setAppliedCustom({ from, to });
              }}
              className="mb-2 rounded-xl border border-gold/40 px-4 py-3"
            >
              <Typography variant="body" className="text-center text-gold">
                Update
              </Typography>
            </Pressable>
          </View>

          <FunnelPanel
            snapshot={funnel.snapshot}
            trackingReady={funnel.trackingReady}
            loading={funnel.loading}
            error={funnel.error}
            hideRangeForm
            notLiveMessage="Step tracking not live yet."
          />

          <View className="mb-8 px-6">
            <SectionHeader eyebrow="Traffic" title="Sources" />
            <Card>
              {traffic.sources.length === 0 ? (
                <Typography variant="bodyMuted">No source data for this period.</Typography>
              ) : (
                traffic.sources.map((row) => (
                  <View key={row.host} className="mb-3 border-b border-gold/10 pb-3">
                    <View className="flex-row justify-between">
                      <Typography variant="body" className="flex-1 pr-2">
                        {row.host}
                      </Typography>
                      <Typography variant="subtitle" className="text-gold">
                        {formatConversion(row.conversionPct)}
                      </Typography>
                    </View>
                    <Typography variant="caption">
                      {row.visitors} visitors · {row.applications} applications
                    </Typography>
                  </View>
                ))
              )}
            </Card>
          </View>

          <Breakdown title="Top pages" data={traffic.topPages} />
          <Breakdown title="Top countries" data={traffic.topCountries} />

          <View className="mb-8 px-6">
            <SectionHeader eyebrow="Quality" title="Bot share" />
            <Card>
              <Typography variant="body">
                {traffic.botSharePct == null
                  ? 'Not enough requests to measure crawlers yet.'
                  : `${traffic.botSharePct}% of requests were crawlers (excluded from every figure above).`}
              </Typography>
              <Typography variant="caption" className="mt-2">
                This period: {traffic.viewsHumansSelected} human views,{' '}
                {traffic.viewsIncludingBotsSelected} including crawlers.
              </Typography>
            </Card>
          </View>
        </>
      )}

      <View className="mb-2 px-6">
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">
              {dogs.length}
            </Typography>
            <Typography variant="caption" className="mt-1">
              Total Dogs
            </Typography>
          </Card>
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">
              {clients.length}
            </Typography>
            <Typography variant="caption" className="mt-1">
              Clients
            </Typography>
          </Card>
        </View>
      </View>

      <View className="h-6" />
      <Breakdown title="Dogs by Status" data={countBy(dogs, (d) => d.status ?? 'unknown')} />
      <Breakdown title="Dogs by Category" data={countBy(dogs, (d) => d.category ?? 'unknown')} />
      <Breakdown title="Applications by Status" data={countBy(applications, (a) => a.status)} />
      <Breakdown title="Litters by Status" data={countBy(litters, (l) => l.status ?? 'unknown')} />
    </ScreenContainer>
  );
}
