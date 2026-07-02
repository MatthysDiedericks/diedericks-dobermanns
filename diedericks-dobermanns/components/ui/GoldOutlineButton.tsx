import { Pressable, Text, type PressableProps } from 'react-native';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  fullWidth?: boolean;
}

/** Secondary heritage button — gold border and label. */
export function GoldOutlineButton({ label, fullWidth, disabled, ...rest }: Props) {
  return (
    <Pressable
      disabled={disabled}
      className={`h-12 items-center justify-center rounded-xl border border-gold bg-transparent px-6 ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      <Text className="font-display text-sm uppercase tracking-widest text-gold">{label}</Text>
    </Pressable>
  );
}
