import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { kindLabel } from '@/lib/dogs/healthCalendar';
import { fetchKennelHealthDue, type KennelHealthDueRow } from '@/lib/followUps/kennelHealthDue';
import { fetchLineHealthReport, type LineHealthReport } from '@/lib/followUps/lineHealth';

function pct(n: number | null) {
  if (n == null) return '—';
  return `${Math.round(n * 100)}%`;
}

export default function HealthFollowUpsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<KennelHealthDueRow[]>([]);
  const [report, setReport] = useState<LineHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [due, line] = await Promise.all([fetchKennelHealthDue(), fetchLineHealthReport()]);
      setRows(due);
      setReport(line);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load health follow-ups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const overdue = rows.filter((r) => r.daysUntil < 0);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Welfare" title="Health follow-ups" />
      {loading && rows.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : null}
      {error ? (
        <View className="px-6">
          <Typography variant="body" className="mb-3 text-danger">
            {error}
          </Typography>
          <Button label="Retry" size="sm" variant="outline" onPress={() => void refresh()} />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 px-6 pb-24"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
        }
        ListHeaderComponent={
          report ? (
            <Card className="mb-2">
              <Typography variant="label" className="mb-2 text-gold">
                Health of our lines
              </Typography>
              <Typography variant="caption">
                Average lifespan {report.overall.avgLifespanYears?.toFixed(1) ?? '—'} years (n ={' '}
                {report.overall.nLifespan})
              </Typography>
              <Typography variant="caption">
                DCM screening {pct(report.overall.dcmRate)} (n = {report.overall.nDcm})
              </Typography>
              <Typography variant="caption">
                Check-in response {pct(report.overall.responseRate)} — answered{' '}
                {report.overall.nAnswered} of {report.overall.nSent}
              </Typography>
              <Typography variant="caption" className="mt-2 text-subtle">
                {overdue.length} overdue. Wording matches the dog health calendar — never a second
                way of saying late.
              </Typography>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState title="Nothing due" message="That is a good outcome." />
          ) : null
        }
        renderItem={({ item }) => (
          <Card className={item.daysUntil < 0 ? 'border-l-4 border-l-danger' : undefined}>
            <Typography variant="body">{item.dogName}</Typography>
            <Typography variant="caption" className="text-gold">
              {kindLabel(item.kind)} · {item.title}
            </Typography>
            <Typography
              variant="caption"
              className={item.daysUntil < 0 ? 'text-danger' : 'text-subtle'}
            >
              {item.dueLabel}
            </Typography>
            <View className="mt-2">
              <Button
                label="Open dog"
                size="sm"
                variant="outline"
                onPress={() =>
                  router.push({ pathname: '/(admin)/dogs/[id]', params: { id: item.dogId } })
                }
              />
            </View>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}
