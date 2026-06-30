import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { BroadcastChannel } from '@/types/app.types';

export const BROADCAST_CHANNELS: {
  key: BroadcastChannel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'push', label: 'Push Notification', icon: 'notifications' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { key: 'telegram', label: 'Telegram', icon: 'paper-plane' },
];

export function ChannelToggle({
  channels,
  onToggle,
}: {
  channels: BroadcastChannel[];
  onToggle: (c: BroadcastChannel) => void;
}) {
  return (
    <View className="gap-2">
      {BROADCAST_CHANNELS.map((c) => {
        const active = channels.includes(c.key);
        return (
          <Pressable key={c.key} onPress={() => onToggle(c.key)}>
            <Card className="flex-row items-center">
              <Ionicons name={c.icon} size={18} color={active ? Colors.gold : Colors.silver} />
              <Typography variant="body" className="ml-3 flex-1">{c.label}</Typography>
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={22}
                color={active ? Colors.gold : Colors.silver}
              />
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
