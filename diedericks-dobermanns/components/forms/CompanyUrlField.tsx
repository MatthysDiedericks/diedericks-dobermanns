import { useRef } from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { OPENED_FIELD, TRAP_FIELD } from '@/lib/security/botDefence';

let sessionOpenedAt: number | null = null;

/** Off-screen field. Hidden from VoiceOver / TalkBack. Not an autofill target. */
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
      accessibilityLabel=""
      style={{ position: 'absolute', left: -10000, height: 1, width: 1, overflow: 'hidden', opacity: 0 }}
      pointerEvents="none"
    >
      <Input
        label="Company website"
        value={value}
        onChangeText={onChange}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
      />
    </View>
  );
}

/** Clock starts on first mount of this JS session, not on the last step. */
export function useFormOpenedAt(): number {
  const openedAt = useRef(sessionOpenedAt ?? Date.now()).current;
  sessionOpenedAt = openedAt;
  return openedAt;
}

export { OPENED_FIELD, TRAP_FIELD };
