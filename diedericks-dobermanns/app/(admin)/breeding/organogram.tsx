import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useOrganogramDogs } from '@/hooks/useBreedingProgramme';
import { LINE_COLORS } from '@/lib/breeding/constants';
import type { BreedingDog } from '@/types/breeding';

function OrganogramNode({ dog, onPress }: { dog: BreedingDog; onPress: () => void }) {
  const color = LINE_COLORS[dog.line ?? 'Unknown'] ?? LINE_COLORS.Unknown;
  return (
    <Pressable
      onPress={onPress}
      className="mx-1 mb-2 min-w-[120px] rounded-xl border p-3"
      style={{ borderColor: color, backgroundColor: `${color}22` }}
    >
      <Typography variant="caption" style={{ color }}>
        Gen {dog.generation ?? '?'} · Line {dog.line ?? '?'}
      </Typography>
      <Typography variant="body" className="mt-1">
        {dog.name}
      </Typography>
      {dog.breeding_role ? (
        <Typography variant="caption" className="text-subtle">
          {dog.breeding_role}
        </Typography>
      ) : null}
    </Pressable>
  );
}

function GenerationRow({
  title,
  dogs,
  onDogPress,
}: {
  title: string;
  dogs: BreedingDog[];
  onDogPress: (id: string) => void;
}) {
  if (dogs.length === 0) return null;
  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-3 text-gold">
        {title}
      </Typography>
      <View className="flex-row flex-wrap justify-center">
        {dogs.map((d) => (
          <OrganogramNode key={d.id} dog={d} onPress={() => onDogPress(d.id)} />
        ))}
      </View>
      <View className="mx-auto my-2 h-6 w-0.5 bg-gold/30" />
    </View>
  );
}

export default function BreedingOrganogramScreen() {
  const router = useRouter();
  const { dogs, loading } = useOrganogramDogs();

  const byGen = useMemo(() => {
    const map = new Map<number, BreedingDog[]>();
    for (const d of dogs) {
      const g = d.generation ?? 1;
      const arr = map.get(g) ?? [];
      arr.push(d);
      map.set(g, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [dogs]);

  const gen1Sires = dogs.filter(
    (d) => (d.generation ?? 1) === 1 && (d.breeding_role === 'Sire' || d.sex === 'male'),
  );
  const gen1Dams = dogs.filter(
    (d) => (d.generation ?? 1) === 1 && (d.breeding_role === 'Dam' || d.sex === 'female'),
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding Programme" title="Generation Tree" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4 text-subtle">
          Tap any node to open the full dog profile.
        </Typography>

        {loading ? (
          <CardListSkeleton count={3} />
        ) : dogs.length === 0 ? (
          <Typography variant="body" className="text-subtle">
            Assign line and generation on breeding dogs to populate the organogram.
          </Typography>
        ) : (
          <>
            <GenerationRow
              title="GEN 1 — FOUNDERS"
              dogs={[...gen1Sires, ...gen1Dams]}
              onDogPress={(id) => router.push(`/(admin)/dogs/${id}` as never)}
            />

            {byGen
              .filter(([g]) => g >= 2)
              .map(([gen, genDogs]) => (
                <GenerationRow
                  key={gen}
                  title={`GEN ${gen}`}
                  dogs={genDogs}
                  onDogPress={(id) => router.push(`/(admin)/dogs/${id}` as never)}
                />
              ))}
          </>
        )}

        <View className="mt-4 flex-row flex-wrap gap-3">
          {(['A', 'B', 'Cross'] as const).map((line) => (
            <View key={line} className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: LINE_COLORS[line] }}
              />
              <Typography variant="caption">Line {line}</Typography>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
