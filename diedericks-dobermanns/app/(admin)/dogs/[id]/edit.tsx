import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Image } from 'expo-image';

import { DogForm } from '@/components/forms/DogForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDog } from '@/hooks/useDogs';
import { deleteDog, useSubmitting } from '@/hooks/useMutations';

export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dog, loading, error } = useDog(id);
  const { submitting, run } = useSubmitting();

  async function onDelete() {
    if (!id) return;
    const { error } = await run(() => deleteDog(id));
    if (!error) router.replace('/(admin)/dogs');
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle" className="text-danger">{error}</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  if (!dog) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Dog not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  const primaryPhoto =
    dog.media?.find((m) => m.is_primary)?.thumbnail_url ??
    dog.media?.find((m) => m.is_primary)?.url ??
    dog.media?.[0]?.thumbnail_url ??
    dog.media?.[0]?.url;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Edit Record" title={dog.name} />
        {primaryPhoto ? (
          <View className="mx-6 mb-4 h-24 w-24 overflow-hidden rounded-xl border border-gold/30">
            <Image
              source={{ uri: primaryPhoto }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        ) : null}
        <View className="px-6">
          <DogForm dog={dog} onSaved={() => router.replace('/(admin)/dogs')} />
          <Button
            label="Manage Photos"
            variant="outline"
            onPress={() => router.push({ pathname: '/(admin)/dogs/[id]/photos', params: { id } })}
            fullWidth
            className="mt-3"
          />
          <Button
            label="Edit Pedigree"
            variant="outline"
            onPress={() => router.push({ pathname: '/(admin)/dogs/[id]/pedigree', params: { id } })}
            fullWidth
            className="mt-3"
          />
          <Button
            label="Manage Story / Training Updates"
            variant="outline"
            onPress={() => router.push({ pathname: '/(admin)/dogs/[id]/story', params: { id } })}
            fullWidth
            className="mt-3"
          />
          <Button
            label="Delete Dog"
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
