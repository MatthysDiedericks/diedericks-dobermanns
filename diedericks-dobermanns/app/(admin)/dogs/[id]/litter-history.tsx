import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { LitterHistoryTable } from '@/components/litters/LitterRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useFemaleLitterHistory } from '@/hooks/useLittersIndex';

export default function DogLitterHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rows, summary, loading } = useFemaleLitterHistory(id);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding history" title="Litter History" />
      <Card className="mx-6 mb-4">
        <Typography variant="body">
          {summary.litters} litters · {summary.puppies} puppies born · {summary.deceased} deceased
        </Typography>
      </Card>
      <View className="px-6 pb-12">
        {loading ? <CardListSkeleton count={2} /> : <LitterHistoryTable rows={rows} />}
      </View>
    </ScreenContainer>
  );
}
