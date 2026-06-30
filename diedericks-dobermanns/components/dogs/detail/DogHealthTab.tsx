import { View } from 'react-native';

import { DogHealthRecordsSection } from '@/components/dogs/detail/DogHealthRecordsSection';
import { DogHealthWeightSection } from '@/components/dogs/detail/DogHealthWeightSection';

export function DogHealthTab({ dogId }: { dogId: string }) {
  return (
    <View className="pb-8">
      <DogHealthRecordsSection dogId={dogId} />
      <DogHealthWeightSection dogId={dogId} />
    </View>
  );
}
