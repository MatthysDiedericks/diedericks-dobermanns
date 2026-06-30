import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { titleCase } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { TrainingLog } from '@/types/app.types';

interface DogTrainingTabProps {
  dogId: string;
  logs: TrainingLog[];
}

export function DogTrainingTab({ dogId, logs }: DogTrainingTabProps) {
  const router = useRouter();
  const recent = logs.slice(0, 10);

  return (
    <View className="px-6 pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        RECENT TRAINING
      </Typography>
      <Card className="mb-4">
        {recent.length === 0 ? (
          <Typography variant="bodyMuted">No sessions logged yet.</Typography>
        ) : (
          recent.map((log, i) => (
            <View
              key={log.id}
              className={`py-2 ${i < recent.length - 1 ? 'border-b border-gold/10' : ''}`}
            >
              <Typography variant="body">{titleCase(log.training_type)}</Typography>
              <Typography variant="caption" className="text-subtle">
                {log.milestone ?? formatKennelDate(log.session_date)}
              </Typography>
            </View>
          ))
        )}
      </Card>
      <Button
        label="View All Updates"
        variant="outline"
        onPress={() => router.push(`/(portal)/training-updates/${dogId}` as never)}
        fullWidth
        className="mb-3"
      />
      <Button
        label="Submit Video for Review"
        variant="secondary"
        onPress={() => router.push('/(portal)/training/bookings' as never)}
        fullWidth
      />
    </View>
  );
}
