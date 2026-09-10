import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { ApplySuccessView } from '@/components/apply/ApplySuccessView';
import { ApplicationForm } from '@/components/forms/ApplicationForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function ApplyScreen() {
  const { dog_id } = useLocalSearchParams<{ dog_id?: string }>();
  const [reference, setReference] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  if (reference) {
    return <ApplySuccessView reference={reference} warning={warning} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Join the Programme" title="Apply" back={false} />
        <View className="px-6">
          <ApplicationForm
            onSubmitted={(ref, submitWarning) => {
              setReference(ref);
              setWarning(submitWarning ?? null);
            }}
            initialDogId={typeof dog_id === 'string' ? dog_id : undefined}
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
