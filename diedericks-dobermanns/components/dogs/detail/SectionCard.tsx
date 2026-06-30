import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}

export function SectionCard({ title, children, action }: SectionCardProps) {
  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="label" className="text-gold">
          {title.toUpperCase()}
        </Typography>
        {action ? (
          <Pressable onPress={action.onPress}>
            <Typography variant="caption" className="text-gold">
              {action.label}
            </Typography>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
