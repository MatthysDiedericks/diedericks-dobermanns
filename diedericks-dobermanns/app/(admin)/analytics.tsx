import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import {
  useAdminApplications,
  useAdminDogs,
  useAdminLitters,
  useClients,
} from '@/hooks/useAdmin';
import { useWebsiteTraffic } from '@/hooks/useWebsiteTraffic';
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

function StatPair({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}) {
  return (
    <View className="mb-3 flex-row gap-3 px-6">
      <Card className="flex-1">
        <Typography variant="displayLg" className="text-gold">
          {leftValue}
        </Typography>
        <Typography variant="caption" className="mt-1">
          {leftLabel}
        </Typography>
      </Card>
      <Card className="flex-1">
        <Typography variant="displayLg" className="text-gold">
          {rightValue}
        </Typography>
        <Typography variant="caption" className="mt-1">
          {rightLabel}
        </Typography>
      </Card>
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const { data: dogs, refetch: refetchDogs } = useAdminDogs();
  const { data: applications, refetch: refetchApps } = useAdminApplications();
  const { data: litters, refetch: refetchLitters } = useAdminLitters();
  const { data: clients, refetch: refetchClients } = useClients();
  const {
    data: traffic,
    loading: trafficLoading,
    error: trafficError,
    refresh: refreshTraffic,
  } = useWebsiteTraffic();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDogs?.(),
      refetchApps?.(),
      refetchLitters?.(),
      refetchClients?.(),
      refreshTraffic(),
    ]);
    setRefreshing(false);
  }, [refetchDogs, refetchApps, refetchLitters, refetchClients, refreshTraffic]);

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
          <StatPair
            leftLabel="Views today"
            leftValue={traffic.viewsToday}
            rightLabel="Visitors today"
            rightValue={traffic.visitorsToday}
          />
          <StatPair
            leftLabel="Views this week"
            leftValue={traffic.viewsWeek}
            rightLabel="Visitors this week"
            rightValue={traffic.visitorsWeek}
          />
          <Breakdown title="Top pages (30 days)" data={traffic.topPages} />
          <Breakdown title="Top countries (30 days)" data={traffic.topCountries} />
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
