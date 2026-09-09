import type { Control } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { IdFields } from '@/components/forms/ApplicationForm/IdFields';
import { ControlledInput } from '@/components/forms/fields';
import { SelectField } from '@/components/forms/SelectField';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { COUNTRIES, SA_PROVINCES } from '@/constants/regions';
import {
  BUYER_LOCATION_OPTIONS,
  EXPORT_CHECKBOX_LABEL,
  EXPORT_NOTE_BODY,
  EXPORT_NOTE_TITLE,
  needsExportAck,
} from '@/lib/apply/buyerLocation';
import { Typography } from '@/components/ui/Typography';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step1Personal({ control }: StepProps) {
  const country = useWatch({ control, name: 'country' });
  const location = useWatch({ control, name: 'buyer_location_type' });
  const showExport = needsExportAck(location);

  return (
    <View>
      <Typography variant="caption" className="mb-2 text-silver uppercase tracking-widest">
        Where are you buying from? *
      </Typography>
      <Controller
        control={control}
        name="buyer_location_type"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View className="mb-4">
            {BUYER_LOCATION_OPTIONS.map((opt) => {
              const active = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                  }`}
                >
                  <Typography variant="body" className={active ? 'text-gold' : ''}>
                    {opt.label}
                  </Typography>
                </Pressable>
              );
            })}
            {error?.message ? (
              <Typography variant="caption" className="text-danger">
                {error.message}
              </Typography>
            ) : null}
          </View>
        )}
      />
      {showExport ? (
        <View className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <Typography variant="subtitle" className="text-gold">
            {EXPORT_NOTE_TITLE}
          </Typography>
          {EXPORT_NOTE_BODY.split('\n\n').map((para) => (
            <Typography key={para.slice(0, 24)} variant="bodyMuted" className="mt-2 leading-5">
              {para}
            </Typography>
          ))}
          <Controller
            control={control}
            name="export_terms_acknowledged"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mt-4">
                <Pressable onPress={() => onChange(!value)} className="flex-row items-start gap-3">
                  <View
                    className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                      value ? 'border-gold bg-gold' : 'border-gold/40'
                    }`}
                  >
                    {value ? (
                      <Typography variant="caption" className="font-bold text-black">
                        ✓
                      </Typography>
                    ) : null}
                  </View>
                  <Typography variant="body" className="flex-1">
                    {EXPORT_CHECKBOX_LABEL}
                  </Typography>
                </Pressable>
                {error?.message ? (
                  <Typography variant="caption" className="mt-2 text-danger">
                    {error.message}
                  </Typography>
                ) : null}
              </View>
            )}
          />
        </View>
      ) : null}

      <ControlledInput control={control} name="full_name" label="Full legal name *" placeholder="Your full name" autoCapitalize="words" />
      <IdFields control={control} />
      <ControlledInput control={control} name="email" label="Email address *" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
      <ControlledInput control={control} name="phone" label="Phone number *" placeholder="+27 ..." keyboardType="phone-pad" />
      <ControlledInput control={control} name="occupation" label="Occupation *" placeholder="Your occupation" autoCapitalize="words" />
      <ControlledInput control={control} name="employer" label="Employer (optional)" placeholder="Company or employer" autoCapitalize="words" />
      <SelectField control={control} name="country" label="Country *" options={COUNTRIES} />
      {country === 'South Africa' ? (
        <SelectField
          control={control}
          name="province"
          label="Province"
          placeholder="Select province"
          options={SA_PROVINCES}
        />
      ) : (
        <ControlledInput control={control} name="province" label="Province / State (optional)" />
      )}
      <ControlledInput control={control} name="city" label="City (optional)" />
      <ControlledInput
        control={control}
        name="address"
        label="Physical address *"
        placeholder="Address where the dog will live"
        multiline
      />
    </View>
  );
}
