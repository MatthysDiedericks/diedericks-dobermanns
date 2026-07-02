import { Pressable, Text, type PressableProps } from 'react-native';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Primary heritage CTA — gold fill, dark Cinzel label. */
export function GoldButton({ label, loading, fullWidth, disabled, ...rest }: Props) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={`h-12 items-center justify-center rounded-xl bg-gold px-6 shadow-md ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      <Text className="font-display text-sm uppercase tracking-widest text-black-rich">
        {loading ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );
}
