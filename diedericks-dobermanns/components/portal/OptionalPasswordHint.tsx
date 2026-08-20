import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

const KEY = 'dd-optional-password-hint';

/** Quiet, dismissible. Password setup stays optional forever. */
export function OptionalPasswordHint() {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <View className="mb-4 flex-row items-start justify-between gap-3 rounded-xl border border-gold/20 bg-black-rich p-4">
      <Typography variant="caption" className="flex-1 text-subtle">
        Set a password if you would like to sign in without a link. This is optional — your invite
        link will keep working.
      </Typography>
      <Pressable
        onPress={() => {
          void KEY;
          setHidden(true);
        }}
      >
        <Typography variant="caption" className="text-gold">
          Dismiss
        </Typography>
      </Pressable>
    </View>
  );
}
