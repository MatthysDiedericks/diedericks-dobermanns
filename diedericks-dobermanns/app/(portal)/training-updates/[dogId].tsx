import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useTrainingLogs } from '@/hooks/useRecords';
import { titleCase } from '@/lib/format';

export default function TrainingUpdatesScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { data: logs, loading } = useTrainingLogs(dogId ?? '');

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Progress" title="Training Updates" />
      <View className="gap-3 px-6">
        {!loading && logs.length === 0 ? (
          <EmptyState
            title="No sessions logged yet"
            message="Your trainer will post updates here as training progresses."
          />
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="barbell" size={18} color={Colors.gold} />
                  <Typography variant="subtitle" className="ml-2">
                    {titleCase(log.training_type)}
                  </Typography>
                </View>
                {log.progress_level ? (
                  <Badge label={titleCase(log.progress_level)} tone="gold" />
                ) : null}
              </View>
              <Typography variant="caption" className="mt-1">
                {new Date(log.session_date).toLocaleDateString()}
                {log.duration_minutes ? ` · ${log.duration_minutes} min` : ''}
              </Typography>
              {log.milestone ? (
                <Typography variant="body" className="mt-2 text-gold">
                  {log.milestone}
                </Typography>
              ) : null}
              {log.notes ? (
                <Typography variant="bodyMuted" className="mt-1">
                  {log.notes}
                </Typography>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
