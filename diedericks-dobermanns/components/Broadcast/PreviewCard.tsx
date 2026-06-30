import { Image } from 'expo-image';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';

export function PreviewCard({
  title,
  body,
  imageUrl,
}: {
  title: string;
  body: string;
  imageUrl: string | null;
}) {
  return (
    <Card>
      {imageUrl ? (
        <View className="mb-3 h-40 w-full overflow-hidden rounded-xl bg-surface">
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
      ) : null}
      <Typography variant="subtitle">{title}</Typography>
      <Typography variant="bodyMuted" className="mt-1">{body}</Typography>
    </Card>
  );
}
