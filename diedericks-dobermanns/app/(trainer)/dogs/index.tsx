import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useTrainerDogs } from '@/hooks/useTrainer';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TrainerDogsScreen() {
  const router = useRouter();
  const { dogs, loading, refresh } = useTrainerDogs();

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#C4A35A" />}>
      <PageHeader eyebrow="Training" title="My Dogs" back={false} />

      <View className="gap-3 px-6">
        {!loading && dogs.length === 0 ? (
          <EmptyState
            title="No dogs in training"
            message="Dogs assigned to your sessions will appear here."
          />
        ) : (
          dogs.map(({ dog, completedSessions, lastSessionDate }) => {
            const photo = profilePhotoUrl(dog.media);
            return (
              <Pressable key={dog.id} onPress={() => router.push(`/(trainer)/dogs/${dog.id}` as never)}>
                <Card className="flex-row items-center gap-3">
                  <View className="h-16 w-16 overflow-hidden rounded-xl bg-surface">
                    {photo ? (
                      <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Typography variant="subtitle">{dog.name}</Typography>
                    <Typography variant="caption" className="mt-0.5 capitalize">
                      {dog.colour?.replace('_', ' ') ?? 'Dobermann'}
                    </Typography>
                    <Typography variant="caption" className="mt-1 text-silver">
                      {completedSessions} completed · Last {formatDate(lastSessionDate)}
                    </Typography>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
