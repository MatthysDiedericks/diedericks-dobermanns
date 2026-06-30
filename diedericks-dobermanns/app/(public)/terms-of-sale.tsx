import { View } from 'react-native';

import { TermsOfSaleContent } from '@/components/legal/TermsOfSaleContent';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function TermsOfSaleScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Legal" title="Terms & Conditions of Sale" back />
      <View className="px-6 pb-10">
        <TermsOfSaleContent />
      </View>
    </ScreenContainer>
  );
}
