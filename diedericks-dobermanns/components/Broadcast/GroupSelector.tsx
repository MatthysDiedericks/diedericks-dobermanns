import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { ClientGroup } from '@/types/app.types';

export function GroupSelector({
  groups,
  selectedGroup,
  onSelect,
}: {
  groups: ClientGroup[];
  selectedGroup: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {groups.map((g) => {
        const active = selectedGroup === g.id;
        return (
          <Pressable key={g.id} onPress={() => onSelect(g.id)}>
            <Card className={`flex-row items-center ${active ? 'border border-gold' : ''}`}>
              <View className="flex-1">
                <Typography variant="body">{g.name}</Typography>
                <Typography variant="caption" className="mt-0.5">
                  {g.member_count != null ? `${g.member_count} members` : 'Members'}
                </Typography>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={20} color={Colors.gold} /> : null}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
