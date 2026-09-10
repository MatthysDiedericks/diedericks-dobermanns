import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CatalogueManager } from '@/components/equipment/CatalogueManager';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function CatalogueSettingsScreen() {
  const { item } = useLocalSearchParams<{ item?: string }>();
  const initialItemId = typeof item === 'string' ? item : Array.isArray(item) ? item[0] : undefined;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Quote catalogue" />
      <View className="gap-4 px-6 pb-10">
        <CatalogueManager initialItemId={initialItemId} />
      </View>
    </ScreenContainer>
  );
}
