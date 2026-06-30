import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';

interface DogLinksTabProps {
  dogId: string;
  variant: 'documents' | 'gallery';
}

export function DogLinksTab({ dogId, variant }: DogLinksTabProps) {
  const router = useRouter();
  if (variant === 'gallery') {
    return (
      <View className="pb-8">
        <SectionCard title="Gallery">
          <Button
            label="Manage Photos & Videos"
            onPress={() => router.push(`/(admin)/dogs/${dogId}/photos` as never)}
            fullWidth
          />
        </SectionCard>
      </View>
    );
  }

  return (
    <View className="pb-8 gap-4">
      <SectionCard title="Documents & records">
        <Button
          label="Manage Photos & Videos"
          onPress={() => router.push(`/(admin)/dogs/${dogId}/photos` as never)}
          fullWidth
          className="mb-3"
        />
        <Button
          label="Edit Pedigree"
          variant="outline"
          onPress={() => router.push(`/(admin)/dogs/${dogId}/pedigree` as never)}
          fullWidth
          className="mb-3"
        />
        <Button
          label="Training Story"
          variant="outline"
          onPress={() => router.push(`/(admin)/dogs/${dogId}/story` as never)}
          fullWidth
        />
      </SectionCard>
    </View>
  );
}
