import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useDocumentTriageCounts } from '@/hooks/useDocumentTriageCounts';

const QUEUES = [
  { href: '/(admin)/documents/unlabelled', label: 'Unlabelled files', key: 'unlabelled' as const },
  { href: '/(admin)/documents/pending', label: 'Pending client files', key: 'pendingClient' as const },
  { href: '/(admin)/media/pending', label: 'Pending photos', key: 'pendingMedia' as const },
] as const;

export function DocumentQueueLinks() {
  const router = useRouter();
  const { counts } = useDocumentTriageCounts();

  return (
    <View className="mb-4 px-6">
      {QUEUES.map((q) => (
        <Pressable
          key={q.href}
          onPress={() => router.push(q.href as never)}
          className="mb-2 flex-row items-center justify-between rounded-sm border border-gold/20 bg-surface px-4 py-3"
        >
          <Typography variant="label" className="text-gold">
            {q.label}
          </Typography>
          <Typography variant="caption" className="text-subtle">
            {counts[q.key]}
          </Typography>
        </Pressable>
      ))}
    </View>
  );
}
