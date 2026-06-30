import { Text, type TextProps } from 'react-native';

/**
 * Brand typography primitives. Display variants use Cinzel; body uses Inter.
 * Always prefer these over raw <Text> so fonts/colours stay consistent.
 */

type Variant =
  | 'hero'
  | 'displayLg'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyMuted'
  | 'label'
  | 'caption';

const VARIANT_CLASS: Record<Variant, string> = {
  // Display / heading variants use Cinzel. Hero is gold, centred, wide tracking.
  hero: 'font-display text-4xl uppercase tracking-widest text-gold text-center',
  displayLg: 'font-display text-3xl uppercase tracking-wide text-ink',
  display: 'font-display text-2xl uppercase tracking-wide text-ink',
  title: 'font-display-semibold text-xl tracking-wide text-ink',
  subtitle: 'font-display-semibold text-base tracking-wide text-ink',
  // Body / supporting variants stay on Inter.
  body: 'font-body text-base leading-6 text-ink',
  bodyMuted: 'font-body text-base leading-6 text-ink-muted',
  label: 'font-body-semibold text-xs uppercase tracking-widest text-gold',
  caption: 'font-body text-xs text-silver',
};

interface TypographyProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Typography({
  variant = 'body',
  className,
  ...rest
}: TypographyProps) {
  return <Text className={`${VARIANT_CLASS[variant]} ${className ?? ''}`} {...rest} />;
}
