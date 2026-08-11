import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  fetchProgenyGroups,
  type ProgenyGroup,
  type RelativeDog,
} from '@/lib/breeding/relatives';

interface DogProgenySectionProps {
  dogId: string;
  profileRoutePrefix?: string;
}

function PuppyRow({ dog, prefix }: { dog: RelativeDog; prefix: string }) {
  const router = useRouter();
  const label = dog.call_name ? `${dog.name} (${dog.call_name})` : dog.name;
  return (
    <Pressable
      onPress={() => router.push(`${prefix}${dog.id}` as never)}
      className="mb-1 rounded-lg border border-gold/10 px-3 py-2"
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

export function DogProgenySection({
  dogId,
  profileRoutePrefix = '/(admin)/dogs/',
}: DogProgenySectionProps) {
  const [groups, setGroups] = useState<ProgenyGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchProgenyGroups(dogId)
      .then((g) => {
        if (!cancelled) setGroups(g);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load progeny');
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
  if (!groups.length) {
    return (
      <Typography variant="bodyMuted">No progeny found in this system.</Typography>
    );
  }

  const total = groups.reduce((n, g) => n + g.dogs.length, 0);

  return (
    <View>
      <Typography variant="caption" className="mb-4 text-muted">
        {total} offspring in {groups.length} group{groups.length === 1 ? '' : 's'}
      </Typography>
      {groups.map((g) => (
        <View key={g.litterId ?? 'ungrouped'} className="mb-5">
          <Typography variant="label" className="mb-1 text-silver">
            {g.litterLabel ?? 'Litter'}
            {g.actualDate ? ` · ${formatKennelDate(g.actualDate)}` : ''}
            {` · ${g.dogs.length}`}
          </Typography>
          {g.dogs.map((d) => (
            <PuppyRow key={d.id} dog={d} prefix={profileRoutePrefix} />
          ))}
        </View>
      ))}
    </View>
  );
}
