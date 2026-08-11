import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  fetchSiblingGroups,
  type RelativeDog,
  type SiblingGroups,
} from '@/lib/breeding/relatives';

interface DogSiblingsSectionProps {
  dogId: string;
  profileRoutePrefix?: string;
}

function DogLink({
  dog,
  prefix,
}: {
  dog: RelativeDog;
  prefix: string;
}) {
  const router = useRouter();
  const label = dog.call_name ? `${dog.name} (${dog.call_name})` : dog.name;
  return (
    <Pressable
      onPress={() => router.push(`${prefix}${dog.id}` as never)}
      className="mb-2 rounded-xl border border-gold/15 bg-black-rich px-3 py-2"
    >
      <Typography variant="body" className="text-gold">
        {label}
      </Typography>
      <Typography variant="caption" className="text-muted">
        {[dog.sex, formatKennelDate(dog.date_of_birth)].filter(Boolean).join(' · ')}
      </Typography>
    </Pressable>
  );
}

function Group({
  title,
  dogs,
  prefix,
}: {
  title: string;
  dogs: RelativeDog[];
  prefix: string;
}) {
  if (!dogs.length) return null;
  return (
    <View className="mb-5">
      <Typography variant="label" className="mb-2 text-silver">
        {title} ({dogs.length})
      </Typography>
      {dogs.map((d) => (
        <DogLink key={d.id} dog={d} prefix={prefix} />
      ))}
    </View>
  );
}

export function DogSiblingsSection({
  dogId,
  profileRoutePrefix = '/(admin)/dogs/',
}: DogSiblingsSectionProps) {
  const [groups, setGroups] = useState<SiblingGroups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSiblingGroups(dogId)
      .then((g) => {
        if (!cancelled) setGroups(g);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load siblings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  if (loading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }
  if (error) {
    return <Typography variant="body" className="text-danger">{error}</Typography>;
  }
  if (!groups) return null;

  const total =
    groups.littermates.length +
    groups.fullSiblings.length +
    groups.halfBySire.length +
    groups.halfByDam.length;

  if (!total) {
    return (
      <Typography variant="bodyMuted">No siblings found in this system.</Typography>
    );
  }

  return (
    <View>
      <Group title="Littermates" dogs={groups.littermates} prefix={profileRoutePrefix} />
      <Group
        title="Full siblings (other litters)"
        dogs={groups.fullSiblings}
        prefix={profileRoutePrefix}
      />
      <Group title="Half-siblings by sire" dogs={groups.halfBySire} prefix={profileRoutePrefix} />
      <Group title="Half-siblings by dam" dogs={groups.halfByDam} prefix={profileRoutePrefix} />
    </View>
  );
}
