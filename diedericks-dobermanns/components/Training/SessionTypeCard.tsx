import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { TrainingSessionType } from '@/types/app.types';

export function SessionTypeCard({
  type,
  onToggleActive,
}: {
  type: TrainingSessionType;
  onToggleActive: () => void;
}) {
  return (
    <Card>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Typography variant="subtitle" className={type.is_active ? 'text-gold' : 'text-silver'}>
            {type.name}
          </Typography>
          <Typography variant="caption" className="mt-1">
            {type.duration_minutes} min · {type.price ? `${type.currency} ${type.price}` : 'Free'} ·{' '}
            {type.session_format.replace('_', ' ')}
          </Typography>
        </View>
        <Pressable onPress={onToggleActive}>
          <Badge label={type.is_active ? 'Active' : 'Hidden'} tone={type.is_active ? 'success' : 'muted'} />
        </Pressable>
      </View>
      {type.description ? (
        <Typography variant="bodyMuted" className="mt-2">{type.description}</Typography>
      ) : null}
    </Card>
  );
}
