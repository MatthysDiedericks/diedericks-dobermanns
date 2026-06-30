import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { LitterHistoryTable } from '@/components/litters/LitterRow';
import { PuppyCard } from '@/components/litters/PuppyCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { isActiveLitter, useFemaleLitterHistory, useLittersIndex } from '@/hooks/useLittersIndex';
import { formatKennelDate, formatPuppyAge } from '@/lib/kennel/formatters';

type ViewMode = 'all' | 'female';

export default function AdminLittersScreen() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('all');
  const [femaleId, setFemaleId] = useState<string | undefined>();
  const { active, completed, loading, error } = useLittersIndex();
  const femaleHistory = useFemaleLitterHistory(view === 'female' ? femaleId : undefined);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding" title="Litters" back={false} />
      <View className="mb-4 flex-row items-center justify-between px-6">
        <Button label="+ New Litter" onPress={() => router.push('/(admin)/litters/new')} />
        <View className="flex-row gap-2">
          {(['all', 'female'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              className={`rounded-full border px-3 py-2 ${view === v ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">{v === 'all' ? 'ALL LITTERS' : 'BY FEMALE'}</Typography>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'all' ? (
        <ScrollView className="px-6 pb-12">
          {loading ? <CardListSkeleton count={3} /> : null}
          {error ? <Typography variant="body" className="text-danger">{error}</Typography> : null}
          {!loading && active.length === 0 && completed.length === 0 ? (
            <EmptyState title="No litters yet" message="Plan your first litter." />
          ) : null}
          {active.map((l) => (
            <LitterGroup key={l.id} litter={l} active />
          ))}
          {completed.length > 0 ? (
            <Typography variant="label" className="mb-3 mt-6 text-gold">
              COMPLETED
            </Typography>
          ) : null}
          {completed.map((l) => (
            <LitterGroup key={l.id} litter={l} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView className="px-6 pb-12">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <Pressable
              onPress={() => setFemaleId(undefined)}
              className={`mr-2 rounded-full border px-3 py-2 ${!femaleId ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">All Females</Typography>
            </Pressable>
            {femaleHistory.females.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setFemaleId(f.id)}
                className={`mr-2 rounded-full border px-3 py-2 ${femaleId === f.id ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Typography variant="caption">{f.name}</Typography>
              </Pressable>
            ))}
          </ScrollView>
          {femaleHistory.loading ? <CardListSkeleton count={2} /> : null}
          <LitterHistoryTable rows={femaleHistory.rows} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function LitterGroup({
  litter,
  active = false,
}: {
  litter: ReturnType<typeof useLittersIndex>['litters'][0];
  active?: boolean;
}) {
  const router = useRouter();
  const letter = litter.litter_letter ? `Litter ${litter.litter_letter}` : litter.name ?? 'Litter';
  return (
    <View className="mb-8">
      <View className="mb-2 flex-row items-start justify-between">
        <View>
          <Typography variant="subtitle">
            {formatKennelDate(litter.actual_date)}
            {litter.go_home_date ? ` (${formatPuppyAge(litter.actual_date)} · home ${formatKennelDate(litter.go_home_date)})` : ''}
          </Typography>
          <Typography variant="bodyMuted">
            {letter} · Dam: {litter.mother?.name ?? '—'} · Sire: {litter.father?.name ?? '—'}
          </Typography>
        </View>
        <View className="items-end gap-2">
          {active || isActiveLitter(litter.status) ? <Badge label="ACTIVE" tone="gold" /> : null}
          <Pressable onPress={() => router.push(`/(admin)/litters/${litter.id}` as never)}>
            <Typography variant="label" className="text-gold">
              Go To Litter →
            </Typography>
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {(litter.puppies ?? []).map((p) => (
          <PuppyCard key={p.id} {...p} />
        ))}
      </ScrollView>
    </View>
  );
}
