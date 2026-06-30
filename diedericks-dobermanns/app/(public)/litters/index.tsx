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

function formatDate(value: string | null): string {
  if (!value) return 'TBC';
  return new Date(value).toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });
}

export default function LittersScreen() {
  const router = useRouter();
  const { data: litters, loading } = useLitters();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Planned Pairings" title="Expected Litters" />
      <View className="gap-4 px-6">
        {!loading && litters.length === 0 ? (
          <EmptyState title="No litters announced yet" />
        ) : (
          litters.map((litter) => (
            <Pressable key={litter.id} onPress={() => router.push(`/litters/${litter.id}`)}>
              <Card>
                <View className="flex-row items-center justify-between">
                  <Typography variant="title" className="flex-1">
                    {litter.name ?? 'Upcoming Litter'}
                  </Typography>
                  <Badge label={titleCase(litter.status)} tone="gold" />
                </View>
                <Typography variant="caption" className="mt-2">
                  Expected {formatDate(litter.expected_date)}
                  {litter.available_count != null
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
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
