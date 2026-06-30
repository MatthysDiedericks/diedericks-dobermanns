import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

/** Dark form input with label + inline validation error. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerClassName, className, ...rest },
  ref,
) {
  return (
    <View className={containerClassName ?? 'mb-4'}>
      {label ? (
        <Text className="mb-2 font-body-semibold text-xs uppercase tracking-widest text-silver">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={Colors.silver}
        className={[
          'rounded-xl border bg-surface px-4 py-3 font-body text-base text-ink',
          error ? 'border-danger' : 'border-gold/20',
          className ?? '',
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <Text className="mt-1 font-body text-xs text-danger">{error}</Text>
      ) : null}
    </View>
  );
});
