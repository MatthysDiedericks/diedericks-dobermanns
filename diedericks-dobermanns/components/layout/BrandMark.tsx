import { Image } from 'expo-image';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface BrandMarkProps {
  size?: 'sm' | 'lg';
  /** Show the "Diedericks Dobermanns" wordmark beneath the badge. */
  showWordmark?: boolean;
  showSlogan?: boolean;
}

/**
 * Centered circular badge logo with optional wordmark beneath.
 * The double-D monogram stands in for the final logo asset.
 */
export function BrandMark({
  size = 'sm',
  showWordmark = true,
  showSlogan = false,
}: BrandMarkProps) {
  const badge = size === 'lg' ? 'h-20 w-20' : 'h-12 w-12';
  return (
    <View className="items-center">
      <View
        className={`${badge} items-center justify-center rounded-full border-2 border-gold bg-nav overflow-hidden`}
      >
        <Image
          source={require('@/assets/monogram-source.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </View>
      {showWordmark ? (
        <View className="mt-3 items-center">
          <Typography variant={size === 'lg' ? 'displayLg' : 'subtitle'} className="text-center">
            Diedericks
          </Typography>
          <Typography variant="label" className="mt-0.5">
            Dobermanns
          </Typography>
        </View>
      ) : null}
      {showSlogan ? (
        <Typography variant="caption" className="mt-2 text-center">
          Born With Purpose. Built With Discipline.
        </Typography>
      ) : null}
    </View>
  );
}
