import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

/** Dark elevated surface used for content blocks across the app. */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-gold/15 bg-black-rich p-4 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
