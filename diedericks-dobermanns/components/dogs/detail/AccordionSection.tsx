import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface AccordionSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionSection({
  title,
  count,
  children,
  defaultOpen = false,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View className="mb-3 overflow-hidden rounded-xl border border-gold/20 bg-surface">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <View className="flex-row items-center gap-2">
          <Typography variant="subtitle" className="text-gold">
            {title}
          </Typography>
          {count != null ? <Badge label={String(count)} tone="gold" /> : null}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.gold}
        />
      </Pressable>
      {open ? <View className="border-t border-gold/10 px-4 pb-4 pt-2">{children}</View> : null}
    </View>
  );
}
