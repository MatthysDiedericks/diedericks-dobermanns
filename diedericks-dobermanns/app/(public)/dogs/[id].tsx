import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PublicPhotoGallery } from '@/components/dogs/PublicPhotoGallery';
import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { DogStory } from '@/components/dogs/DogStory';
import { Pedigree, hasPedigree } from '@/components/dogs/Pedigree';
import { Button } from '@/components/ui/Button';
import { Collapsible } from '@/components/ui/Collapsible';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDog } from '@/hooks/useDogs';
import { useDogTimeline } from '@/hooks/useRecords';
import { formatAge, formatPrice, titleCase } from '@/lib/format';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="subtitle" className="mt-1">
        {value}
      </Typography>
    </View>
  );
}

export default function DogProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dog, loading, error } = useDog(id);
  const { data: story } = useDogTimeline(id ?? '');

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={{ paddingTop: 0 }}>
        <Skeleton className="h-80 w-full rounded-none" />
        <View className="px-6 pt-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-3 h-9 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <Skeleton className="mt-6 h-20 w-full" />
          <Skeleton className="mt-6 h-14 w-full" />
          <Skeleton className="mt-3 h-14 w-full" />
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="px-6 items-center justify-center">
        <Typography variant="subtitle" className="text-danger">{error}</Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  if (!dog) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Dog not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={{ paddingTop: 0 }}>
      <View>
        <PublicPhotoGallery media={dog.media ?? []} />
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/dogs'))}
          style={{ top: insets.top + 8 }}
          className="absolute left-6 h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black/70"
        >
          <Ionicons name="chevron-back" size={18} color={Colors.gold} />
        </Pressable>
      </View>

      <View className="px-6 pt-6">
        <DogStatusBadge status={dog.status} />
        <Typography variant="displayLg" className="mt-3">
          {dog.name}
        </Typography>
        <Typography variant="label" className="mt-2">
          {formatPrice(dog.price)}
        </Typography>

        {/* Key stats */}
        <View className="mt-6 flex-row rounded-2xl border border-gold/15 bg-black-rich py-4">
          <Stat label="Sex" value={titleCase(dog.sex)} />
          <Stat label="Colour" value={titleCase(dog.colour)} />
          <Stat label="Age" value={formatAge(dog.date_of_birth)} />
          <Stat label="Bloodline" value={titleCase(dog.bloodline)} />
        </View>

        {/* Sections */}
        <View className="mt-6">
          {dog.description ? (
            <Collapsible title="About This Dog" defaultOpen>
              <Typography variant="bodyMuted">{dog.description}</Typography>
            </Collapsible>
          ) : null}

          <Collapsible title="Health Testing">
            <View className="gap-2">
              <Typography variant="bodyMuted">
                Health tested: {dog.health_tested ? 'Yes' : 'Not yet'}
              </Typography>
              <Typography variant="bodyMuted">Hip (HD): {dog.hip_score ?? '—'}</Typography>
              <Typography variant="bodyMuted">Elbow (ED): {dog.elbow_score ?? '—'}</Typography>
              <Typography variant="bodyMuted">
                DCM status: {titleCase(dog.dcm_status)}
              </Typography>
            </View>
          </Collapsible>

          {dog.temperament_notes ? (
            <Collapsible title="Temperament">
              <Typography variant="bodyMuted">{dog.temperament_notes}</Typography>
            </Collapsible>
          ) : null}

          {dog.training_notes ? (
            <Collapsible title="Training Background">
              <Typography variant="bodyMuted">{dog.training_notes}</Typography>
            </Collapsible>
          ) : null}

          {hasPedigree(dog.pedigree) ? (
            <Collapsible title="Pedigree">
              <Pedigree pedigree={dog.pedigree!} />
            </Collapsible>
          ) : null}

          {story.length ? (
            <Collapsible title="Training Story">
              <DogStory entries={story} />
            </Collapsible>
          ) : null}
        </View>

        <Button
          label={`Enquire About ${dog.name.split(' ')[0]}`}
          onPress={() => router.push('/apply')}
          fullWidth
          className="mt-8"
        />
      </View>
    </ScreenContainer>
  );
}
