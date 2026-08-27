import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { PublicPhotoGallery } from '@/components/dogs/PublicPhotoGallery';
import { PageHeader } from '@/components/layout/PageHeader';
import { MilestonesStrip } from '@/components/litters/MilestonesStrip';
import { PublicPuppyCard } from '@/components/litters/PublicPuppyCard';
import { PuppyGrowthChart } from '@/components/litters/PuppyGrowthChart';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useGrowthBenchmark } from '@/hooks/useGrowthBenchmark';
import { usePublicLitterDetail } from '@/hooks/usePublicLitterDetail';
import { titleCase } from '@/lib/format';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';

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

export default function LitterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { litter, puppies, weightsByPuppyId, uniqueDates, galleryMedia, milestones, loading } =
    usePublicLitterDetail(id);
  const { benchmarkCurve } = useGrowthBenchmark(litter?.puppy_count ?? puppies.length ?? 1);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!litter) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Litter not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Litter" title={litter.name ?? 'Upcoming Litter'} />
      <View className="px-6">
        <View className="mb-4 flex-row">
          <Badge label={titleCase(litter.status)} tone="gold" />
        </View>

        <View className="flex-row rounded-2xl border border-gold/15 bg-black-rich py-4">
          <Stat label="Expected" value={litter.expected_date ?? 'TBC'} />
          <Stat label="Puppies" value={String(litter.puppy_count ?? '—')} />
          <Stat label="Available" value={String(litter.available_count ?? '—')} />
        </View>

        {litter.description ? (
          <Card className="mt-6">
            <Typography variant="bodyMuted">{litter.description}</Typography>
          </Card>
        ) : null}

        {milestones.length > 0 ? (
          <View className="mt-6">
            <Typography variant="label" className="mb-2">
              MILESTONES
            </Typography>
            <MilestonesStrip milestones={milestones} />
          </View>
        ) : null}

        {galleryMedia.length > 0 ? (
          <View className="-mx-6 mt-6">
            <PublicPhotoGallery media={galleryMedia} />
          </View>
        ) : null}

        <View className="mt-6">
          <Typography variant="label" className="mb-3">
            PUPPIES
          </Typography>
          {puppies.length === 0 ? (
            <EmptyState title="No puppies listed yet" message="Check back soon for updates." />
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {puppies.map((p) => {
                const logs = weightsByPuppyId.get(p.id) ?? [];
                const latest = logs[logs.length - 1] ?? null;
                const photoUrl = profilePhotoUrl(p.dog_media);
                return (
                  <PublicPuppyCard
                    key={p.id}
                    name={p.name}
                    sex={p.sex}
                    collarColour={p.collar_colour}
                    status={p.status}
                    photoUrl={photoUrl}
                    latestWeightKg={latest?.weight_kg ?? null}
                  />
                );
              })}
            </View>
          )}
        </View>

        {puppies.length > 0 ? (
          <PuppyGrowthChart
            puppies={puppies}
            weightsByPuppyId={weightsByPuppyId}
            uniqueDates={uniqueDates}
            whelpDate={litter.actual_date}
            benchmarkCurve={benchmarkCurve}
          />
        ) : null}

        <Button
          label="Join the Waiting List"
          onPress={() => router.push('/apply')}
          fullWidth
          className="mt-8"
        />
      </View>
    </ScreenContainer>
  );
}
