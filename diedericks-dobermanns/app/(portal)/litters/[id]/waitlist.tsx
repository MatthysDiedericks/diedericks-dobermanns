import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { joinLitterWaitlist, useSubmitting } from '@/hooks/useMutations';
import { useLitterWaitlistStatus } from '@/hooks/usePortal';
import { useAuthStore } from '@/stores/authStore';

export default function LitterWaitlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const litterId = id ?? '';
  const router = useRouter();
  const userId = useAuthStore((s) => s.profile?.id);
  const { litterName, alreadyJoined, loading, error } = useLitterWaitlistStatus(litterId);
  const { submitting, run } = useSubmitting();
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  async function join() {
    if (!userId) return;
    const { error: joinErr } = await run(() => joinLitterWaitlist(userId, litterId, notes.trim()));
    if (!joinErr) setDone(true);
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Waiting list" title={litterName} />
      <View className="px-6 pb-10">
        {error ? <Typography variant="body" className="mb-4 text-danger">{error}</Typography> : null}
        {done ? (
          <Card className="p-4">
            <Typography variant="subtitle" className="text-gold">
              You are on the list
            </Typography>
            <Typography variant="bodyMuted" className="mt-2">
              We will contact you when a puppy becomes available. You can track progress in your portal.
            </Typography>
            <Button label="View my waitlist" onPress={() => router.push('/(portal)/waitlist')} fullWidth className="mt-4" />
          </Card>
        ) : alreadyJoined ? (
          <Card className="p-4">
            <Typography variant="body">
              You are already on the waiting list for this litter.
            </Typography>
            <Button label="View progress" onPress={() => router.push('/(portal)/waitlist')} fullWidth className="mt-4" />
          </Card>
        ) : (
          <>
            <Typography variant="bodyMuted" className="mb-4">
              Join the waiting list to express interest in {litterName}. Share any preferences below.
            </Typography>
            <Input
              label="Preference notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. preferred sex, colour, timeline…"
              multiline
              numberOfLines={4}
            />
            <Button label="Join Waiting List" onPress={join} loading={submitting} fullWidth className="mt-4" />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
