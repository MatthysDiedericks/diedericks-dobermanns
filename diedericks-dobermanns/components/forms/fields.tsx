import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';

interface ControlledInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  multiline,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: ControlledInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={(value as string) ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className={multiline ? 'h-24' : undefined}
        />
      )}
    />
  );
}

interface OptionGroupProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: { value: string; label: string }[];
}

/** Single-select chip group bound to a form field. */
export function OptionGroup<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: OptionGroupProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View className="mb-4">
          <Typography variant="caption" className="mb-2 text-silver">
            {label}
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  className={`rounded-xl border px-4 py-2.5 ${
                    active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                  }`}
                >
                  <Typography
                    variant="caption"
                    className={active ? 'text-gold' : 'text-ink-muted'}
                  >
                    {opt.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
          {error ? (
            <Typography variant="caption" className="mt-1 text-danger">
              {error.message}
            </Typography>
          ) : null}
        </View>
      )}
    />
  );
}

interface ToggleRowProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/** Boolean yes/no toggle bound to a form field. */
export function ToggleRow<T extends FieldValues>({
  control,
  name,
  label,
}: ToggleRowProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Pressable
          onPress={() => onChange(!value)}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gold/20 bg-surface px-4 py-3"
        >
          <Typography variant="body">{label}</Typography>
          <View
            className={`h-6 w-11 rounded-full p-0.5 ${value ? 'bg-gold' : 'bg-black-rich'}`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-ink ${value ? 'ml-auto' : ''}`}
            />
          </View>
        </Pressable>
      )}
    />
  );
}
