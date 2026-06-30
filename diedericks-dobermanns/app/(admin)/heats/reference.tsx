import { ScrollView } from 'react-native';

import { BreedingReferenceContent } from '@/components/heats/BreedingReferenceContent';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function HeatReferenceScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding" title="Reference Guide" />
      <ScrollView className="px-4">
        <BreedingReferenceContent />
      </ScrollView>
    </ScreenContainer>
  );
}
