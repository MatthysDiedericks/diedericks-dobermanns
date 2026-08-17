import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { evaluatePassword } from '@/lib/auth/passwordPolicy';

type PasswordChecklistProps = {
  password: string;
};

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const checks = evaluatePassword(password);
  return (
    <View className="mb-3 mt-1" accessibilityLiveRegion="polite">
      {checks.map((check) => (
        <View key={check.id} className="mb-1 flex-row items-center">
          <Ionicons
            name={check.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={check.met ? '#C4A35A' : '#9E9880'}
          />
          <Typography
            variant="caption"
            className={`ml-2 ${check.met ? 'text-gold' : 'text-muted'}`}
          >
            {check.label}
          </Typography>
        </View>
      ))}
    </View>
  );
}
