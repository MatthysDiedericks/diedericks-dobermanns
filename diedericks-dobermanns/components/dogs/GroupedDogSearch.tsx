import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { CollarDots } from '@/components/dogs/CollarDots';
import { DogDirectoryCard } from '@/components/dogs/DogDirectoryCard';
import { Typography } from '@/components/ui/Typography';
import type { DirectoryDog } from '@/lib/dogs/directory';
import {
  groupDogSearch,
  litterBucketLine,
  noDogMatchLine,
  type DogSearchable,
} from '@/lib/dogs/search';

export function GroupedDogSearch({
  dogs,
  query,
  detailRoute,
}: {
  dogs: Array<DirectoryDog & DogSearchable>;
  query: string;
  detailRoute: (dogId: string) => string;
}) {
  const router = useRouter();
  const groups = groupDogSearch(dogs, query);
  const empty = groups.every((g) => g.dogs.length === 0 && g.litters.length === 0);

  if (empty) {
    return (
      <Typography variant="body" className="px-6 text-amber-200">
        {noDogMatchLine(query)}
      </Typography>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 96 }}>
      {groups.map((group) => (
        <View key={group.heading} className="mb-6">
          <Typography variant="label" className="mb-2 text-gold">
            {group.heading}
          </Typography>
          {group.litters.map((bucket) => (
            <View key={bucket.litterId ?? bucket.label} className="mb-4">
              <Typography variant="body" className="mb-2">
                {litterBucketLine(bucket)}
              </Typography>
              <CollarDots
                dogs={bucket.puppies}
                onPress={(id) => router.push(detailRoute(id) as never)}
              />
            </View>
          ))}
          {group.dogs.map((dog) => (
            <DogDirectoryCard
              key={dog.id}
              dog={dog}
              detailRoute={detailRoute(dog.id)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
