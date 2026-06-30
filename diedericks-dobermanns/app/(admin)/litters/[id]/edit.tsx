import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';

import { LitterForm } from '@/components/forms/LitterForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminLitters } from '@/hooks/useAdmin';
import { deleteLitter, useSubmitting } from '@/hooks/useMutations';

export default function EditLitterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: litters, loading } = useAdminLitters();
  const { submitting, run } = useSubmitting();
  const litter = litters.find((l) => l.id === id);

  async function onDelete() {
    if (!id) return;
    const { error } = await run(() => deleteLitter(id));
    if (!error) router.replace('/(admin)/litters');
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!litter) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Litter not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Edit Record" title={litter.name ?? 'Litter'} />
        <View className="px-6">
          <LitterForm litter={litter} onSaved={() => router.replace('/(admin)/litters')} />
          <Button
            label="Delete Litter"
            variant="danger"
            onPress={onDelete}
            loading={submitting}
            fullWidth
            className="mt-3"
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
