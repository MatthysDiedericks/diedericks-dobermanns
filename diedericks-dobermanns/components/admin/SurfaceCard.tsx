import { View, Pressable, type ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface SurfaceCardProps extends ViewProps {
  title: string;
  href?: string;
  badge?: string | number;
  badgeTone?: 'gold' | 'danger' | 'neutral';
  children: React.ReactNode;
}

export function SurfaceCard({
  title,
  href,
  badge,
  badgeTone = 'neutral',
  children,
  className,
  ...rest
}: SurfaceCardProps) {
  const router = useRouter();
  const badgeClass =
    badgeTone === 'danger'
      ? 'bg-danger/20 text-danger'
      : badgeTone === 'gold'
        ? 'bg-gold/20 text-gold'
        : 'bg-surface text-subtle';

  return (
    <View
      className={`mb-4 overflow-hidden rounded-sm border border-gold/20 bg-black-rich ${className ?? ''}`}
      {...rest}
    >
      <View className="border-t-2 border-gold px-4 py-3 flex-row items-center justify-between">
        <Pressable
          onPress={href ? () => router.push(href as never) : undefined}
          disabled={!href}
          className="flex-row items-center gap-2 flex-1"
        >
          <Typography variant="label" className="text-gold uppercase tracking-widest">
            {title}
          </Typography>
          {href ? <Ionicons name="chevron-forward" size={14} color={Colors.gold} /> : null}
        </Pressable>
        {badge != null && Number(badge) > 0 ? (
          <View className={`rounded-full px-2 py-0.5 ${badgeClass}`}>
            <Typography variant="caption">{badge}</Typography>
          </View>
        ) : null}
      </View>
      <View className="px-4 pb-4">{children}</View>
    </View>
  );
}
