import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { DogForm } from '@/components/forms/DogForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import type { DogCategory } from '@/types/app.types';

const CATEGORIES: DogCategory[] = ['puppy', 'adult', 'breeding_stock', 'training_dog'];

export default function NewDogScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const defaultCategory = CATEGORIES.includes(category as DogCategory)
    ? (category as DogCategory)
    : undefined;
  const isBreeding = defaultCategory === 'breeding_stock';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="New Record" title={isBreeding ? 'Add Breeding Stock' : 'Add Dog'} />
        <View className="px-6">
          <DogForm defaultCategory={defaultCategory} onSaved={() => router.back()} />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
