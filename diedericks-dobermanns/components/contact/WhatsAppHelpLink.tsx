import { Pressable } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useContactWhatsApp } from '@/hooks/useContactWhatsApp';
import { openWhatsApp } from '@/lib/social';

/**
 * Tappable route to a person when the client is stuck. Hidden when the
 * number is missing so we never render an empty or broken link.
 */
export function WhatsAppHelpLink({ className }: { className?: string }) {
  const { number } = useContactWhatsApp();
  if (!number) return null;

  return (
    <Pressable
      onPress={() =>
        openWhatsApp(number, 'Hi, I need help with the Diedericks Dobermanns app.')
      }
      accessibilityRole="link"
      accessibilityLabel="WhatsApp us and we will help"
      className={className}
    >
      <Typography variant="caption" className="text-center text-gold">
        WhatsApp us and we will help
      </Typography>
    </Pressable>
  );
}
