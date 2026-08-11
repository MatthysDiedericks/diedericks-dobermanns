import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import {
  MatingAddSheet,
  type MatingAddSheetHandle,
} from '@/components/heats/MatingAddSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useMatings } from '@/hooks/useMatings';
import { MATING_TYPES, type HeatCycleRecord } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';

function relativeToOvulation(matedAt: string, ovulation: string | null) {
  if (!ovulation) return null;
  const days = differenceInCalendarDays(
    parseISO(matedAt.slice(0, 10)),
    parseISO(ovulation),
  );
  if (days === 0) return 'same day as ovulation';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} after ovulation`;
  return `${Math.abs(days)} day${days === -1 ? '' : 's'} before ovulation`;
}

export function MatingsTab({
  cycle,
  onChanged,
}: {
  cycle: HeatCycleRecord | null;
  onChanged: () => void;
}) {
  const { matings, loading, error, refresh, deleteMating } = useMatings(cycle?.id ?? null);
  const sheetRef = useRef<MatingAddSheetHandle>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!cycle) {
    return (
      <Typography variant="bodyMuted" className="py-8 text-center">
        No active cycle to record matings against.
      </Typography>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const confirmDelete = (id: string, index: number) => {
    const isFirst = index === 0;
    Alert.alert(
      'Delete mating?',
      isFirst
        ? 'This is the first mating. The derived mating date and due date will recalculate from the next earliest mating.'
        : 'The derived due date may shift if this was the last covering.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteMating(id).then(onChanged);
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      className="pb-10"
    >
      {loading ? (
        <Typography variant="caption" className="text-muted">
          Loading matings…
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {error}
        </Typography>
      ) : null}

      {matings.length === 0 && !loading ? (
        <Typography variant="bodyMuted" className="mb-4">
          No matings recorded. Add each covering — usually two or three, 24–48 hours apart.
        </Typography>
      ) : (
        matings.map((m, index) => {
          const rel = relativeToOvulation(m.mated_at, cycle.ovulation_date);
          return (
            <Card key={m.id} className="mb-3 p-4">
              <Typography variant="subtitle" className="text-gold">
                Mating {index + 1}
                {rel ? ` · ${rel}` : ''}
              </Typography>
              <Typography variant="body" className="mt-1">
                {formatKennelDate(m.mated_at)}{' '}
                {new Date(m.mated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
              <Typography variant="caption" className="text-muted">
                {m.sire?.name ?? m.external_sire_name ?? 'Unknown sire'} ·{' '}
                {MATING_TYPES.find((t) => t.value === m.mating_type)?.label ?? m.mating_type}
                {m.tie_minutes != null ? ` · tie ${m.tie_minutes} min` : ''}
              </Typography>
              <Pressable onPress={() => confirmDelete(m.id, index)} className="mt-3">
                <Typography variant="caption" className="text-danger">
                  Delete
                </Typography>
              </Pressable>
            </Card>
          );
        })
      )}

      <Button
        label="Add mating"
        onPress={() => sheetRef.current?.open()}
        fullWidth
        className="mt-2"
      />
      <MatingAddSheet
        ref={sheetRef}
        cycle={cycle}
        onSaved={() => {
          void refresh();
          onChanged();
        }}
      />
    </ScrollView>
  );
}
