import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';

/**
 * Stub for the training library. Content lives in `training_guides`
 * (migration 0058 — not applied yet). When the table is live, list published
 * guides by topic here.
 */
export default function TrainingGuidesScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Training" title="Training library" />
      <View className="px-6 pb-10">
        <Card className="mb-4">
          <Typography variant="bodyMuted">
            Guides on bringing your puppy home, house training, socialisation, lead work, and what
            to expect at each age will appear here. They come from the kennel&apos;s training_guides
            table once that migration is applied and Matt publishes articles.
          </Typography>
        </Card>
        <EmptyState
          title="No guides yet"
          message="Check back after the kennel publishes the first training tips."
        />
      </View>
    </ScreenContainer>
  );
}
