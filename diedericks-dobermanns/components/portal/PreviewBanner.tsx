import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

export const PREVIEW_TITLE = 'Disabled in preview.';

export function PreviewBanner({
  clientName,
  adminName,
  onExit,
}: {
  clientName: string;
  adminName: string;
  onExit: () => void;
}) {
  return (
    <View
      className="border-b border-gold px-4 py-3"
      style={{ backgroundColor: Colors.surface }}
    >
      <Typography variant="caption" className="text-gold">
        PREVIEW — viewing {clientName}'s portal · read only · you are still signed in as {adminName}
      </Typography>
      <Pressable onPress={onExit} className="mt-2 self-start rounded-sm border border-gold px-3 py-2">
        <Typography variant="caption" className="text-gold">
          Exit preview
        </Typography>
      </Pressable>
    </View>
  );
}
