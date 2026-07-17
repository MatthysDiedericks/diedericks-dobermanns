import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { type FieldErrors, useForm } from 'react-hook-form';
import { Modal, Pressable, View } from 'react-native';

import { buildApplicationDraft } from '@/components/forms/ApplicationForm/buildDraft';
import { Step1Personal } from '@/components/forms/ApplicationForm/Step1Personal';
import { Step2Lifestyle } from '@/components/forms/ApplicationForm/Step2Lifestyle';
import { Step3Experience } from '@/components/forms/ApplicationForm/Step3Experience';
import { Step4Preferences } from '@/components/forms/ApplicationForm/Step4Preferences';
import { Step5Legal } from '@/components/forms/ApplicationForm/Step5Legal';
import { Step6Review } from '@/components/forms/ApplicationForm/Step6Review';
import {
  applicationSchema,
  defaultApplicationValues,
  STEP_FIELDS,
  STEP_TITLES,
  type ApplicationFormValues,
} from '@/components/forms/ApplicationForm/schema';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useSubmitApplication } from '@/hooks/useApplications';

interface ApplicationFormProps {
  onSubmitted: (referenceId: string) => void;
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View className="mb-6">
      <View className="flex-row gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-surface'}`} />
        ))}
      </View>
      <Typography variant="label" className="mt-3">
        Step {step + 1} of {total} · {STEP_TITLES[step]}
      </Typography>
    </View>
  );
}

const CONTROLLED_STEPS = [
  Step1Personal,
  Step2Lifestyle,
  Step3Experience,
  Step4Preferences,
  Step5Legal,
] as const;

const CHILDREN_STEP_INDEX = 1; // Step2Lifestyle — index into CONTROLLED_STEPS

export function ApplicationForm({ onSubmitted }: ApplicationFormProps) {
  const [step, setStep] = useState(0);
  const { submit, submitting } = useSubmitApplication();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showChildSafetyNotice, setShowChildSafetyNotice] = useState(false);

  const { control, handleSubmit, trigger, getValues } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: defaultApplicationValues,
    mode: 'onTouched',
    shouldUnregister: false,
  });

  const lastStep = STEP_FIELDS.length - 1;
  const StepBody = step < CONTROLLED_STEPS.length ? CONTROLLED_STEPS[step] : null;

  function firstErrorStep(errors: FieldErrors<ApplicationFormValues>): number {
    for (let i = 0; i < STEP_FIELDS.length - 1; i++) {
      if (STEP_FIELDS[i].some((field) => errors[field])) return i;
    }
    return 0;
  }

  function onInvalid(errors: FieldErrors<ApplicationFormValues>) {
    const first = Object.values(errors).find((e) => e?.message);
    setSubmitError(
      first?.message
        ? String(first.message)
        : 'Please complete all required fields before submitting.',
    );
    const errorStep = firstErrorStep(errors);
    if (errorStep < step) setStep(errorStep);
  }

  function advance() {
    setStep((s) => Math.min(s + 1, lastStep));
  }

  async function next() {
    setSubmitError(null);
    const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (!valid) return;
    if (step === CHILDREN_STEP_INDEX && getValues('children_ages')) {
      setShowChildSafetyNotice(true);
      return;
    }
    advance();
  }

  function confirmChildSafetyNotice() {
    setShowChildSafetyNotice(false);
    advance();
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onValid(values: ApplicationFormValues) {
    setSubmitError(null);
    const { referenceId, error } = await submit(buildApplicationDraft(values));
    if (error) setSubmitError(error);
    else if (referenceId) onSubmitted(referenceId);
  }

  return (
    <View>
      <ProgressBar step={step} total={STEP_FIELDS.length} />

      {StepBody ? <StepBody control={control} /> : <Step6Review getValues={getValues} />}

      {submitError ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {submitError}
        </Typography>
      ) : null}

      <View className="mt-4 flex-row gap-3">
        {step > 0 ? (
          <Button label="Back" variant="secondary" onPress={back} className="flex-1" />
        ) : null}
        {step < lastStep ? (
          <Button label="Continue" onPress={next} className="flex-1" />
        ) : (
          <Button
            label="Submit Application"
            onPress={() => void handleSubmit(onValid, onInvalid)()}
            loading={submitting}
            disabled={submitting}
            className="flex-1"
          />
        )}
      </View>

      <Modal visible={showChildSafetyNotice} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full rounded-2xl border border-gold/25 bg-black-rich p-6">
            <Typography variant="subtitle" className="mb-3 text-gold">
              A Reminder Before You Continue
            </Typography>
            <Typography variant="body" className="mb-6 leading-6">
              You've indicated there are children in the household. It remains your
              responsibility as the owner to safeguard your children around the dog, and to
              safeguard the dog around your children, at all times — including during
              introductions, unsupervised moments, and as the dog matures.
            </Typography>
            <Pressable
              onPress={confirmChildSafetyNotice}
              className="rounded-xl bg-gold px-4 py-3.5"
            >
              <Typography variant="body" className="text-center font-semibold text-black">
                I Understand — Continue
              </Typography>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
