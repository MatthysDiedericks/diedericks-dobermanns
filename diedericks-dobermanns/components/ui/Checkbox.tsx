import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}

/** A labelled tick box in the app's dark-gold style. No native Checkbox exists yet, so this is it. */
export function Checkbox({ checked, onChange, label, description }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      className="flex-row items-start gap-3 rounded-xl border border-gold/20 bg-surface px-4 py-3"
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? Colors.gold : Colors.goldMuted}
      />
      <View className="flex-1">
        <Typography variant="body">{label}</Typography>
        {description ? (
          <Typography variant="caption" className="mt-1 text-silver">
            {description}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}
