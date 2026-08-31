import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useSubmitting } from '@/hooks/useMutations';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Quiet death report. Condolence is drafted for Matt — never auto-sent.
 * Optional vet report would use documents insert; keep this screen light.
 */
export default function ReportHealthScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();
  const [diedAt, setDiedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!dogId || !profile?.id || !diedAt) {
      setError('Please add the date.');
      return;
    }
    const { error: err } = await run(async () => {
      const { error: reportErr } = await supabase.from('owner_health_reports').insert({
        dog_id: dogId,
        overall: 'deceased',
        died_at: diedAt,
        reported_at: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || null,
        recorded_by: profile.id,
      });
      if (reportErr) throw new Error(reportErr.message);
    });
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Your Dog" title="Thank you" />
        <View className="px-6">
          <Typography variant="bodyMuted">
            Matt has been notified. Nothing further is required from you right now.
          </Typography>
          <Button label="Back" onPress={() => router.back()} fullWidth className="mt-6" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Your Dog" title="Health change" />
      <View className="px-6">
        <Typography variant="bodyMuted" className="mb-5">
          If your dog has passed away, tell us here. This is private. A condolence message is never
          sent automatically.
        </Typography>
        <Input label="Date" value={diedAt} onChangeText={setDiedAt} placeholder="YYYY-MM-DD" />
        <Input
          label="Note (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything you want Matt to know"
          containerClassName="mb-4 mt-1"
        />
        {error ? (
          <Typography variant="caption" className="mt-3 text-danger">
            {error}
          </Typography>
        ) : null}
        <Button
          label="Mark as deceased"
          onPress={submit}
          loading={submitting}
          disabled={!diedAt}
          fullWidth
          className="mt-6"
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth className="mt-2" />
      </View>
    </ScreenContainer>
  );
}
