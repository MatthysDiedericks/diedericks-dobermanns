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
import { copyApplicationFields } from '@/lib/applications/applyAgain';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMyApplications } from '@/hooks/usePortal';

function referenceCodeFor(id: string) {
  return `DD-${id.slice(0, 8).toUpperCase()}`;
}

export default function ApplyAgainScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: applications } = useMyApplications();
  const previous = applications[0];
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit } = useForm<ApplicationFormValues>({
    defaultValues: defaultApplicationValues as ApplicationFormValues,
  });

  async function onSubmit(values: ApplicationFormValues) {
    if (!userId || !previous) return;
    setBusy(true);
    setError(null);
    const supabase = requireSupabase();
    const { data: full, error: prevErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', previous.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (prevErr || !full) {
      setBusy(false);
      setError(prevErr?.message ?? 'Previous application not found.');
      return;
    }
    const copied = copyApplicationFields(full as Record<string, unknown>);
    const applicationId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('applications').insert({
      ...copied,
      id: applicationId,
      reference_code: referenceCodeFor(applicationId),
      user_id: userId,
      email: full.email,
      phone: full.phone,
      full_name: full.full_name,
      country: full.country,
      agreed_to_terms: full.agreed_to_terms,
      status: 'submitted',
      previous_application_id: previous.id,
      dog_interest: values.dog_interest,
      purpose: values.purpose,
      preferred_sex: values.preferred_sex,
      preferred_colour: values.preferred_colour,
      tail_preference: values.tail_preference,
      preferred_timeline: values.preferred_timeline,
      budget_range: values.budget_range,
      training_planned: values.training_planned,
      security_requirements: values.security_requirements || null,
      special_requests: values.special_requests || null,
      specific_dog_id: (values as ApplicationFormValues & { specific_dog_id?: string }).specific_dog_id || null,
      litter_interest_id: (values as ApplicationFormValues & { litter_interest_id?: string }).litter_interest_id || null,
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
      <PageHeader eyebrow="Progress" title="Apply for another dog" />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-4">
          Name, home, and vet details are copied from your previous application. Tell us about the new dog.
        </Typography>
        <Step4Preferences control={control} />
        {error ? <Typography variant="caption">{error}</Typography> : null}
        <Button
          label="Submit application"
          loading={busy}
          onPress={handleSubmit(onSubmit)}
          className="mt-4"
        />
      </View>
    </ScreenContainer>
  );
}
