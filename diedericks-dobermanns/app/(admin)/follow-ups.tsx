import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { FollowUpCard } from '@/components/followUps/FollowUpCard';
import {
  LogResponseSheet,
  type LogResponseSheetHandle,
} from '@/components/followUps/LogResponseSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useOwnerFollowUps } from '@/hooks/useOwnerFollowUps';
import { KIND_LABELS, type CheckInKind, type DueCheckIn } from '@/lib/followUps/types';

const FILTERS: Array<CheckInKind | 'all'> = [
  'all',
  'birthday',
  'post_placement',
  'health_milestone',
  'manual',
];

export default function OwnerFollowUpsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<CheckInKind | 'all'>('all');
  const { items, loading, error, refresh } = useOwnerFollowUps(filter);
  const sheetRef = useRef<LogResponseSheetHandle>(null);
  const [active, setActive] = useState<DueCheckIn | null>(null);

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Welfare"
        title="Follow-ups"
        rightSlot={
          <Pressable onPress={() => router.push('/(admin)/contacts' as never)}>
            <Typography variant="label" className="text-gold">
              Contacts
            </Typography>
          </Pressable>
        }
      />

      <View className="mb-3 flex-row flex-wrap gap-2 px-4">
        {FILTERS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setFilter(k)}
            className={`rounded-sm border px-3 py-1 ${
              filter === k ? 'border-gold bg-gold/20' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption" className="text-text">
              {k === 'all' ? 'All' : KIND_LABELS[k]}
            </Typography>
          </Pressable>
        ))}
      </View>

      {loading && items.length === 0 ? <CardListSkeleton count={3} /> : null}
      {error ? (
        <View className="px-4">
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="Nothing due this week" message="That is a good outcome." />
      ) : (
        <ScrollView
          className="px-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#C4A35A" />
          }
        >
          {items.map((item) => (
            <FollowUpCard
              key={item.id}
              item={item}
              onRefresh={refresh}
              onLog={() => {
                setActive(item);
                sheetRef.current?.open(item);
              }}
            />
          ))}
          <View className="h-10" />
        </ScrollView>
      )}

      <LogResponseSheet
        ref={sheetRef}
        onSaved={() => {
          setActive(null);
          void refresh();
        }}
      />
      {active ? null : null}
    </ScreenContainer>
  );
}
