import { View } from 'react-native';

import { PedigreeTree } from '@/components/dogs/PedigreeTree';

interface DogPedigreeTabProps {
  dogId: string;
  displayName: string;
  profileRoutePrefix?: string;
}

export function DogPedigreeTab({
  dogId,
  displayName,
  profileRoutePrefix,
}: DogPedigreeTabProps) {
  return (
    <View className="pb-8">
      <PedigreeTree
        dogId={dogId}
        displayName={displayName}
        profileRoutePrefix={profileRoutePrefix}
      />
    </View>
  );
}
