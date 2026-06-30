import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  className?: string;
}

/** Gold eyebrow label + display title with a thin gold divider. */
export function SectionHeader({ eyebrow, title, className }: SectionHeaderProps) {
  return (
    <View className={className ?? 'mb-4'}>
      {eyebrow ? (
        <Typography variant="label" className="mb-1">
          {eyebrow}
        </Typography>
      ) : null}
      <Typography variant="display">{title}</Typography>
      <View className="mt-3 h-px w-12 bg-gold" />
    </View>
  );
}
