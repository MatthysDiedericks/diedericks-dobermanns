import { useRef } from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { OPENED_FIELD, TRAP_FIELD } from '@/lib/security/botDefence';

/** Off-screen field. Real visitors never see it; a bot that fills every input does. */
export function CompanyUrlField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: -10000, height: 1, width: 1, overflow: 'hidden', opacity: 0 }}
    >
      <Input label="Company website" value={value} onChangeText={onChange} autoComplete="off" />
    </View>
  );
}

export function useFormOpenedAt(): number {
  return useRef(Date.now()).current;
}

export { OPENED_FIELD, TRAP_FIELD };
