import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useLitters } from '@/hooks/useContent';
import { titleCase } from '@/lib/format';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="subtitle" className="mt-1">
        {value}
      </Typography>
    </View>
  );
}

export default function LitterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: litters, loading } = useLitters();
  const litter = litters.find((l) => l.id === id);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!litter) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Litter not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Litter" title={litter.name ?? 'Upcoming Litter'} />
      <View className="px-6">
        <View className="mb-4 flex-row">
          <Badge label={titleCase(litter.status)} tone="gold" />
        </View>

        <View className="flex-row rounded-2xl border border-gold/15 bg-black-rich py-4">
          <Stat label="Expected" value={litter.expected_date ?? 'TBC'} />
          <Stat label="Puppies" value={String(litter.puppy_count ?? '—')} />
          <Stat label="Available" value={String(litter.available_count ?? '—')} />
        </View>

        {litter.description ? (
          <Card className="mt-6">
            <Typography variant="bodyMuted">{litter.description}</Typography>
          </Card>
        ) : null}

        <Button
          label="Join the Waiting List"
          onPress={() => router.push('/apply')}
          fullWidth
          className="mt-8"
        />
      </View>
    </ScreenContainer>
  );
}
