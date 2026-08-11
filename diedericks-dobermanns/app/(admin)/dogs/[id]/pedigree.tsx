import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { DogAncestorAnalysis } from '@/components/dogs/DogAncestorAnalysis';
import { DogProgenySection } from '@/components/dogs/DogProgenySection';
import { DogSiblingsSection } from '@/components/dogs/DogSiblingsSection';
import { PedigreeEditorForm } from '@/components/dogs/PedigreeEditorForm';
import { PedigreeTree } from '@/components/dogs/PedigreeTree';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDog } from '@/hooks/useDogs';

const TABS = [
  { id: 'chart', label: 'Chart' },
  { id: 'siblings', label: 'Siblings' },
  { id: 'progeny', label: 'Progeny' },
  { id: 'ancestors', label: 'Ancestor Analysis' },
  { id: 'edit', label: 'Edit' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function PedigreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dogId = id ?? '';
  const { dog, loading, error } = useDog(dogId);
  const [tab, setTab] = useState<TabId>('chart');

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error || !dog) {
    return (
      <ScreenContainer className="px-6 items-center justify-center">
        <Typography variant="subtitle" className="text-danger">
          {error ?? 'Dog not found.'}
        </Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll={false}>
        <PageHeader eyebrow="Pedigree" title={dog.name} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 max-h-12 px-4"
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 ${
                tab === t.id ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">{t.label}</Typography>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          className="px-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'chart' ? (
            <PedigreeTree
              dogId={dogId}
              displayName={dog.name}
              profileRoutePrefix="/(admin)/dogs/"
            />
          ) : null}
          {tab === 'siblings' ? (
            <DogSiblingsSection dogId={dogId} profileRoutePrefix="/(admin)/dogs/" />
          ) : null}
          {tab === 'progeny' ? (
            <DogProgenySection dogId={dogId} profileRoutePrefix="/(admin)/dogs/" />
          ) : null}
          {tab === 'ancestors' ? (
            <DogAncestorAnalysis dogId={dogId} storedCoi={dog.wrights_coi} />
          ) : null}
          {tab === 'edit' ? (
            <PedigreeEditorForm
              dogId={dogId}
              dog={dog}
              onSaved={() => router.back()}
            />
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
