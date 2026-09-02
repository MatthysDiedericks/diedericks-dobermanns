import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { useDocumentTriageCounts } from '@/hooks/useDocumentTriageCounts';

export function DocumentTriageWidget() {
  const router = useRouter();
  const { counts } = useDocumentTriageCounts();
  const total = counts.unlabelled + counts.pendingClient + counts.pendingMedia;

  return (
    <SurfaceCard title="Document triage" href="/(admin)/documents/unlabelled" badge={total} badgeTone="gold">
      <Pressable onPress={() => router.push('/(admin)/documents/unlabelled' as never)}>
        <Typography variant="body">{counts.unlabelled} unlabelled files</Typography>
      </Pressable>
      <View className="mt-2 flex-row gap-4">
        <Pressable onPress={() => router.push('/(admin)/documents/pending' as never)}>
          <Typography variant="caption" className="text-gold">
            {counts.pendingClient} client files
          </Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(admin)/media/pending' as never)}>
          <Typography variant="caption" className="text-gold">
            {counts.pendingMedia} photos
          </Typography>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}
