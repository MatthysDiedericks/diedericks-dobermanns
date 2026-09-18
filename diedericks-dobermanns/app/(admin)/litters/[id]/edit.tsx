import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';

import { LitterForm } from '@/components/forms/LitterForm';
import { LitterDeleteConfirm } from '@/components/litters/LitterDeleteConfirm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminLitters } from '@/hooks/useAdmin';

export default function EditLitterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: litters, loading } = useAdminLitters();
  const litter = litters.find((l) => l.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const puppyCount = (litter as { puppy_count?: number | null } | undefined)?.puppy_count ?? 0;

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
            label={puppyCount > 0 ? 'Archive Litter' : 'Delete Litter'}
            variant="danger"
            onPress={() => setConfirmOpen(true)}
            fullWidth
            className="mt-3"
          />
        </View>
      </ScreenContainer>
      {id ? (
        <LitterDeleteConfirm
          litterId={id}
          litterName={litter.name}
          puppyCount={puppyCount}
          visible={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onDone={() => {
            setConfirmOpen(false);
            router.replace('/(admin)/litters');
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
