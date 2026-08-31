import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

export function PortalHostMarker({
  isGuest,
  holderName,
}: {
  isGuest: boolean;
  holderName: string | null;
}) {
  if (!isGuest) return null;
  return (
    <View className="border-b border-gold/20 bg-black-rich px-4 py-2">
      <Typography variant="caption" className="text-center text-gold">
        {holderName ? `Viewing ${holderName}'s portal` : 'Guest access'}
      </Typography>
    </View>
  );
}
