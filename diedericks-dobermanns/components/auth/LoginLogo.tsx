import { View } from 'react-native';

import { BrandMark } from '@/components/layout/BrandMark';
import { Typography } from '@/components/ui/Typography';

/** Login header — BrandMark with Cinzel wordmark (add assets/images/logo.png to override). */
export function LoginLogo() {
  return (
    <View className="items-center">
      <BrandMark size="lg" />
      <Typography
        variant="label"
        className="mt-4 text-center tracking-[0.25em] text-gold"
      >
        DIEDERICKS DOBERMANNS
      </Typography>
    </View>
  );
}
