import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { ContactInteraction } from '@/types/phase10';

const TYPE_META: Record<
  ContactInteraction['interaction_type'],
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  whatsapp: { icon: 'logo-whatsapp', label: 'WhatsApp' },
  email: { icon: 'mail', label: 'Email' },
  call: { icon: 'call', label: 'Call' },
  meeting: { icon: 'people', label: 'Meeting' },
  note: { icon: 'document-text', label: 'Note' },
  sms: { icon: 'chatbubble', label: 'SMS' },
};

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

export function InteractionCard({ item }: { item: ContactInteraction }) {
  const meta = TYPE_META[item.interaction_type];
  const outbound = item.direction === 'outbound';

  return (
    <Card className="mb-2 border border-gold/15 bg-black-rich">
      <View className="mb-1 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name={meta.icon} size={16} color={Colors.gold} />
          <Typography variant="label">{meta.label}</Typography>
          <Typography variant="caption" className={outbound ? 'text-gold' : 'text-subtle'}>
            {outbound ? '→ Sent' : '← Received'}
          </Typography>
        </View>
        <Typography variant="caption" className="text-subtle">
          {formatWhen(item.interaction_date)}
        </Typography>
      </View>
      {item.subject ? (
        <Typography variant="caption" className="mb-1 text-gold">
          {item.subject}
        </Typography>
      ) : null}
      {item.body ? (
        <Typography variant="body" className="text-ink-muted">
          {item.body}
        </Typography>
      ) : null}
    </Card>
  );
}
