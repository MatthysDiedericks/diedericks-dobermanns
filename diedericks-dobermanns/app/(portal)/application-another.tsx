import { useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';

import { Step4Preferences } from '@/components/forms/ApplicationForm/Step4Preferences';
import {
  defaultApplicationValues,
  type ApplicationFormValues,
} from '@/components/forms/ApplicationForm/schema';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMyApplications } from '@/hooks/usePortal';

export default function ApplyAgainScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: applications } = useMyApplications();
  const previous = applications[0];
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, setValue } = useForm<ApplicationFormValues>({
    defaultValues: defaultApplicationValues as ApplicationFormValues,
  });

  async function onSubmit(values: ApplicationFormValues) {
    if (!userId || !previous) return;
    setBusy(true);
    setError(null);
    const supabase = requireSupabase();
    const { error: insertErr } = await supabase.rpc('add_dog_to_application' as never, {
      p_application_id: previous.id,
      p_prefs: {
        preferred_sex: values.preferred_sex,
        preferred_colour: values.preferred_colour,
        tail_preference: values.tail_preference,
        preferred_timeline: values.preferred_timeline,
        budget_range: values.budget_range,
        notes: values.special_requests || null,
      },
    } as never);
    setBusy(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    router.replace('/(portal)/application-status');
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Progress" title="Add another dog" />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-4">
          This adds another dog to your existing application. You will not be re-vetted and your
          queue date stays the same.
        </Typography>
        <Step4Preferences control={control} setValue={setValue} />
        {error ? <Typography variant="caption">{error}</Typography> : null}
        <Button
          label="Add this dog"
          loading={busy}
          onPress={handleSubmit(onSubmit)}
          className="mt-4"
        />
      </View>
    </ScreenContainer>
  );
}
