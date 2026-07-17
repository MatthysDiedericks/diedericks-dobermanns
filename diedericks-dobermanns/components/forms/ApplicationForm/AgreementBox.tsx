import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface AgreementBoxProps {
  title: string;
  description: string;
  checked: boolean;
  onPress: () => void;
}

export function AgreementBox({ title, description, checked, onPress }: AgreementBoxProps) {
  return (
    <Pressable onPress={onPress} className="mb-3">
      <View
        className={`rounded-xl border p-4 ${checked ? 'border-gold/60 bg-gold/5' : 'border-gold/20 bg-black-rich'}`}
      >
        <View className="flex-row items-start gap-3">
          <View
            className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? 'border-gold bg-gold' : 'border-gold/40'}`}
          >
            {checked ? (
              <Typography variant="caption" className="font-bold text-black">
                ✓
              </Typography>
            ) : null}
          </View>
          <View className="flex-1">
            <Typography variant="subtitle" className="font-semibold">
              {title}
            </Typography>
            {description ? (
              <Typography variant="bodyMuted" className="mt-1 text-sm leading-5">
                {description}
              </Typography>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface ControlledAgreementProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  title: string;
  description: string;
}

/** Mandatory boolean agreement bound to a required true field. */
export function ControlledAgreement<T extends FieldValues>({
  control,
  name,
  title,
  description,
}: ControlledAgreementProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View>
          <AgreementBox
            title={title}
            description={description}
            checked={value === true}
            onPress={() => onChange(value === true ? false : true)}
          />
          {error ? (
            <Typography variant="caption" className="mb-2 text-danger">
              {error.message}
            </Typography>
          ) : null}
        </View>
      )}
    />
  );
}

interface DueDiligenceGroupProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  title: string;
  options: { value: string; label: string; description?: string }[];
  helperNote?: string;
}

/** Single-select due diligence question with AgreementBox-style option cards. */
export function DueDiligenceGroup<T extends FieldValues>({
  control,
  name,
  title,
  options,
  helperNote,
}: DueDiligenceGroupProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View className="mb-4">
          <Typography variant="subtitle" className="mb-3 font-semibold">
            {title}
          </Typography>
          {options.map((opt) => (
            <AgreementBox
              key={opt.value}
              title={opt.label}
              description={opt.description ?? ''}
              checked={value === opt.value}
              onPress={() => onChange(opt.value)}
            />
          ))}
          {helperNote ? (
            <Typography variant="caption" className="mb-2 text-silver">
              {helperNote}
            </Typography>
          ) : null}
          {error ? (
            <Typography variant="caption" className="text-danger">
              {error.message}
            </Typography>
          ) : null}
        </View>
      )}
    />
  );
}
