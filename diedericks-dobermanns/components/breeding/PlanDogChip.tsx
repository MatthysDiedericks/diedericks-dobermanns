import { Image } from 'expo-image';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { PlanDog } from '@/lib/breeding/planTypes';

export function PlanDogChip({ dog, role }: { dog: PlanDog; role: string }) {
  const initial = (dog.name.trim()[0] ?? '?').toUpperCase();
  return (
    <View className="mr-3 flex-row items-center">
      {dog.photoUrl ? (
        <Image
          source={{ uri: dog.photoUrl }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1C1A0E' }}
        />
      ) : (
        <View
          className="items-center justify-center rounded-full bg-gold/20"
          style={{ width: 36, height: 36 }}
        >
          <Typography variant="caption" className="text-gold">
            {initial}
          </Typography>
        </View>
      )}
      <View className="ml-2">
        <Typography variant="caption" className="text-subtle">
          {role}
        </Typography>
        <Typography variant="body" className="text-ink">
          {dog.name}
        </Typography>
      </View>
    </View>
  );
}
