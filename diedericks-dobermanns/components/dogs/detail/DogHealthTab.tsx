import { View } from 'react-native';

import { DogHealthRecordsSection } from '@/components/dogs/detail/DogHealthRecordsSection';
import { DogHealthWeightSection } from '@/components/dogs/detail/DogHealthWeightSection';
import type { Dog } from '@/types/app.types';

export function DogHealthTab({ dogId, dog }: { dogId: string; dog?: Dog }) {
  return (
    <View className="pb-8">
      <DogHealthRecordsSection dogId={dogId} />
      <DogHealthWeightSection dogId={dogId} dog={dog} />
    </View>
  );
}
