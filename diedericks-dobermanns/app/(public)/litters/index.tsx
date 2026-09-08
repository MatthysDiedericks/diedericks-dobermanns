import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useLitters } from '@/hooks/useContent';
import { titleCase } from '@/lib/format';
import { publicLitterKind } from '@/lib/litters/publicPlacement';
import type { Litter } from '@/types/app.types';

function formatDate(value: string | null): string {
  if (!value) return 'TBC';
  return new Date(value).toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });
}

function LitterCard({ litter, placed }: { litter: Litter; placed: boolean }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/litters/${litter.id}`)}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Typography variant="title" className="flex-1">
            {litter.name ?? 'Upcoming Litter'}
          </Typography>
          <Badge label={placed ? 'All placed' : titleCase(litter.status)} tone="gold" />
        </View>
        <Typography variant="caption" className="mt-2">
          {placed ? `Born ${formatDate(litter.actual_date)}` : `Expected ${formatDate(litter.expected_date)}`}
          {placed
            ? ''
            : litter.available_count != null
              ? ` · ${litter.available_count} spots`
              : ''}
        </Typography>
        {litter.description ? (
          <Typography variant="bodyMuted" className="mt-3">
            {litter.description}
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function LittersScreen() {
  const { data: litters, loading } = useLitters();
  const placedLitters = litters.filter((l) => publicLitterKind(l) === 'placed');
  const upcomingLitters = litters.filter((l) => publicLitterKind(l) !== 'placed');

  return (
    <ScreenContainer>
      <PageHeader eyebrow="The Next Generation" title="Our Litters" />
      <View className="gap-4 px-6">
        {!loading && litters.length === 0 ? (
          <EmptyState title="No litters announced yet" />
        ) : (
          <>
            {placedLitters.map((litter) => (
              <LitterCard key={litter.id} litter={litter} placed />
            ))}
            {upcomingLitters.map((litter) => (
              <LitterCard key={litter.id} litter={litter} placed={false} />
            ))}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
