import { useEffect } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { dobMismatchSentence } from '@/lib/identity/dob';
import {
  checkIdNumber,
  defaultIdType,
  ID_TYPE_LABELS,
  ID_TYPES,
  liveIdHint,
  type IdType,
} from '@/lib/identity/idNumber';

const HONESTY =
  'We check the format of the number (length and, for a South African ID, the checksum). That catches typos — it does not prove the number belongs to you.';

export function IdFields({ control }: { control: Control<ApplicationFormValues> }) {
  const country = useWatch({ control, name: 'country' });
  const idNumber = useWatch({ control, name: 'id_number' });
  const idType = useWatch({ control, name: 'id_type' });
  const dateOfBirth = useWatch({ control, name: 'date_of_birth' });
  const idCheck = checkIdNumber({ type: idType, number: idNumber, country });
  const dobMismatch = dobMismatchSentence(idCheck.parsed?.dobIso, dateOfBirth);

  return (
    <View>
      <Controller
        control={control}
        name="date_of_birth"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View>
            <DateField label="Date of birth *" value={value ?? ''} onChange={onChange} />
            {error?.message ? (
              <Typography variant="caption" className="mb-3 text-danger">
                {error.message}
              </Typography>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="id_type"
        render={({ field: { value, onChange } }) => (
          <IdTypeDefault country={country} idNumber={idNumber} value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="id_number"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
          const hint = liveIdHint({ type: idType, number: value, country });
          const failed = Boolean(hint) && hint !== 'Format checks out.';
          return (
            <View>
              <Input
                label="ID / Passport number *"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="characters"
                error={error?.message}
              />
              {!error?.message && hint ? (
                <Typography
                  variant="caption"
                  className={`-mt-2 mb-3 ${failed ? 'text-amber-400' : ''}`}
                >
                  {hint}
                </Typography>
              ) : null}
              {dobMismatch ? (
                <Typography variant="caption" className="-mt-2 mb-3 text-amber-400">
                  {dobMismatch}
                </Typography>
              ) : null}
            </View>
          );
        }}
      />

      <Typography variant="caption" className="mb-4 opacity-70">
        {HONESTY}
      </Typography>
    </View>
  );
}

function IdTypeDefault({
  country,
  idNumber,
  value,
  onChange,
}: {
  country: string;
  idNumber: string;
  value: IdType;
  onChange: (v: IdType) => void;
}) {
  useEffect(() => {
    if (!idNumber) onChange(defaultIdType(country));
  }, [country, idNumber, onChange]);

  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-silver uppercase tracking-widest">
        Document type *
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {ID_TYPES.map((type) => {
          const active = value === type;
          return (
            <Pressable
              key={type}
              onPress={() => onChange(type)}
              className={`rounded-xl border px-4 py-2.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="body" className={active ? 'text-gold' : ''}>
                {ID_TYPE_LABELS[type]}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      <Typography variant="caption" className="mt-2 opacity-70">
        Defaults from your country. Change it if you hold a different document.
      </Typography>
    </View>
  );
}
