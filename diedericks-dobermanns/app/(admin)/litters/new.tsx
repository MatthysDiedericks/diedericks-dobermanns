import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { LitterForm } from '@/components/forms/LitterForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function NewLitterScreen() {
  const router = useRouter();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="New Record" title="Add Litter" />
        <View className="px-6">
          <LitterForm onSaved={() => router.back()} />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
