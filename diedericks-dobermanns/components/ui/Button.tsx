import { useState } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'solid' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Container classes per variant. `primary` (the default) is an outlined gold
 * button that fills with solid gold on press; `solid` is the inverse for the
 * rare cases that need a permanently filled CTA.
 */
function containerClass(variant: Variant, pressed: boolean): string {
  switch (variant) {
    case 'primary':
    case 'outline':
      return pressed ? 'bg-gold border border-gold' : 'bg-transparent border border-gold';
    case 'solid':
      return pressed ? 'bg-gold-light border border-gold-light' : 'bg-gold border border-gold';
    case 'secondary':
      return pressed
        ? 'bg-black-rich border border-gold/50'
        : 'bg-surface border border-gold/30';
    case 'ghost':
      return pressed ? 'bg-surface' : 'bg-transparent';
    case 'danger':
      return pressed ? 'bg-danger opacity-80' : 'bg-danger';
  }
}

/** Label colour per variant, flipping to black when the gold fill is active. */
function labelClass(variant: Variant, pressed: boolean): string {
  switch (variant) {
    case 'primary':
    case 'outline':
      return pressed ? 'text-black' : 'text-gold';
    case 'solid':
      return 'text-black';
    case 'secondary':
    case 'danger':
      return 'text-ink';
    case 'ghost':
      return 'text-gold';
  }
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const sizeClass = { sm: 'px-4 py-2', md: 'px-5 py-3', lg: 'px-6 py-4' }[size];
  const spinnerColor =
    variant === 'solid' || (variant === 'primary' && pressed) || (variant === 'outline' && pressed)
      ? Colors.black
      : variant === 'secondary' || variant === 'danger'
        ? Colors.white
        : Colors.gold;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      className={[
        'flex-row items-center justify-center rounded-xl',
        containerClass(variant, pressed),
        sizeClass,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View>
          <Text
            className={`font-body-semibold text-sm uppercase tracking-widest ${labelClass(variant, pressed)}`}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
