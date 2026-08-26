import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { LOCKED_NOTE } from '@/lib/applications/fieldTiers';
import { openUrl } from '@/lib/social';

export function LockedFieldNote({
  label,
  value,
  whatsappHref,
}: {
  label: string;
  value: string;
  whatsappHref: string | null;
}) {
  return (
    <View className="border-b border-gold/10 py-3">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body" className="mt-1">
        {value || '—'}
      </Typography>
      <Typography variant="caption" className="mt-1">
        {LOCKED_NOTE}
      </Typography>
      {whatsappHref ? (
        <Button
          label="WhatsApp Matt"
          variant="ghost"
          size="sm"
          className="mt-2 self-start"
          onPress={() => openUrl(whatsappHref)}
        />
      ) : null}
    </View>
  );
}
