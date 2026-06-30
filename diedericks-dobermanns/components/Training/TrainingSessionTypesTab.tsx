import { View } from 'react-native';

import { SessionTypeCard } from '@/components/Training/SessionTypeCard';
import { useSessionTypes } from '@/hooks/useTraining';
import { toggleSessionTypeActive, useSubmitting } from '@/hooks/useMutations';

export function TrainingSessionTypesTab() {
  const { data: types, refetch } = useSessionTypes(false);
  const { run } = useSubmitting();

  return (
    <View className="gap-3 px-6">
      {types.map((t) => (
        <SessionTypeCard
          key={t.id}
          type={t}
          onToggleActive={async () => {
            await run(() => toggleSessionTypeActive(t.id, !t.is_active));
            await refetch();
          }}
        />
      ))}
    </View>
  );
}
