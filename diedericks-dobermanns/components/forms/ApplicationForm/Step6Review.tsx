import type { ReactNode } from 'react';
import { Controller, type Control, type UseFormGetValues } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { labelFor } from '@/components/forms/ApplicationForm/labels';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { Typography } from '@/components/ui/Typography';

interface StepProps {
  getValues: UseFormGetValues<ApplicationFormValues>;
  control: Control<ApplicationFormValues>;
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="mb-2 flex-row justify-between border-b border-gold/10 pb-2">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body" className="max-w-[58%] flex-1 text-right">
        {value || '—'}
      </Typography>
    </View>
  );
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-6">
      <Typography variant="subtitle" className="mb-3 text-gold">
        {title}
      </Typography>
      {children}
    </View>
  );
}

export function Step6Review({ getValues, control }: StepProps) {
  const v = getValues();

  return (
    <View>
      <Typography variant="bodyMuted" className="mb-4">
        Please review your details before submitting. All information must be accurate.
      </Typography>

      <ReviewSection title="Personal Details">
        <ReviewRow label="Name" value={v.full_name} />
        <ReviewRow label="Date of birth" value={v.date_of_birth} />
        <ReviewRow label="ID / Passport" value={v.id_number} />
        <ReviewRow label="Email" value={v.email} />
        <ReviewRow label="Phone" value={v.phone} />
        <ReviewRow label="Occupation" value={v.occupation} />
        <ReviewRow label="Address" value={v.address} />
      </ReviewSection>

      <ReviewSection title="Home & Lifestyle">
        <ReviewRow label="Home type" value={labelFor('home_type', v.home_type)} />
        <ReviewRow label="Secure yard" value={labelFor('has_secure_yard', v.has_secure_yard)} />
        <ReviewRow label="Yard size" value={labelFor('yard_size', v.yard_size)} />
        <ReviewRow label="Sleeping" value={labelFor('sleeping_arrangement', v.sleeping_arrangement)} />
        <ReviewRow label="Hours alone" value={labelFor('hours_alone_per_day', v.hours_alone_per_day)} />
      </ReviewSection>

      <ReviewSection title="Experience">
        <ReviewRow label="Why Dobermann" value={v.why_dobermann} />
        <ReviewRow label="Experience" value={labelFor('dobermann_experience_level', v.dobermann_experience_level)} />
        <ReviewRow label="DCM awareness" value={labelFor('aware_of_dcm', v.aware_of_dcm)} />
      </ReviewSection>

      <ReviewSection title="Dog Preference">
        <ReviewRow label="Interest" value={labelFor('dog_interest', v.dog_interest)} />
        <ReviewRow label="Purpose" value={labelFor('purpose', v.purpose)} />
        <ReviewRow label="Sex" value={labelFor('preferred_sex', v.preferred_sex)} />
        <ReviewRow label="Colour" value={labelFor('preferred_colour', v.preferred_colour)} />
        <ReviewRow label="Tail" value={labelFor('tail_preference', v.tail_preference)} />
        <ReviewRow label="Timeline" value={labelFor('preferred_timeline', v.preferred_timeline)} />
        <ReviewRow label="Budget" value={labelFor('budget_range', v.budget_range)} />
      </ReviewSection>

      <ReviewSection title="Legal Agreements">
        <ReviewRow label="No breeding rights" value={v.agreed_no_breeding_rights ? '✓ Agreed' : '—'} />
        <ReviewRow label="Right of recall" value={v.agreed_right_of_recall ? '✓ Agreed' : '—'} />
        <ReviewRow label="No resale" value={v.agreed_no_resale ? '✓ Agreed' : '—'} />
        <ReviewRow label="Welfare commitment" value={v.agreed_welfare_commitment ? '✓ Agreed' : '—'} />
        <ReviewRow label="Microchip policy" value={v.agreed_microchip_policy ? '✓ Agreed' : '—'} />
        <ReviewRow label="Terms & Conditions" value={v.agreed_to_terms ? '✓ Agreed' : '—'} />
        <ReviewRow label="Delivery acknowledged" value={v.delivery_acknowledged ? '✓ Agreed' : '—'} />
      </ReviewSection>

      <View className="mt-4 rounded-xl border border-gold/20 bg-black-rich p-4">
        <Controller
          control={control}
          name="marketing_opt_in"
          render={({ field }) => (
            <Pressable
              onPress={() => field.onChange(!field.value)}
              className="flex-row items-start gap-3"
            >
              <View
                className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                  field.value ? 'border-gold bg-gold' : 'border-gold/40'
                }`}
              >
                {field.value ? (
                  <Typography variant="caption" className="font-bold text-black">
                    ✓
                  </Typography>
                ) : null}
              </View>
              <View className="flex-1">
                <Typography variant="body">
                  Send me news about upcoming litters and training
                </Typography>
                <Typography variant="caption" className="mt-1">
                  Optional. Separate from the terms above. Never required to apply.
                </Typography>
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}
