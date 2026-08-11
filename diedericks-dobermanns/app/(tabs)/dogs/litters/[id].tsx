import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useLitterDetail } from '@/hooks/useDogs';
import { formatKennelDate } from '@/lib/kennel/formatters';

export default function LitterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { litter, puppies, loading, error } = useLitterDetail(id ?? '');

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Litter" back />
        <Typography variant="body" className="px-6">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error || !litter) {
    return (
      <ScreenContainer>
        <PageHeader title="Litter" back />
        <Typography variant="body" className="px-6 text-danger">{error ?? 'Litter not found'}</Typography>
      </ScreenContainer>
    );
  }

  const goHomeLine = [
    litter.go_home_date ? formatKennelDate(litter.go_home_date) : null,
    litter.go_home_weeks != null ? `go home at ${litter.go_home_weeks} weeks` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenContainer>
      <PageHeader title={(litter.name as string) ?? 'Litter'} back />
      {goHomeLine ? (
        <Typography variant="caption" className="mb-2 px-6 text-gold">
          {goHomeLine}
        </Typography>
      ) : null}
      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="body">Dam: {litter.mother?.name ?? '—'}</Typography>
          <Typography variant="body">Sire: {litter.father?.name ?? '—'}</Typography>
          <Typography variant="body">Born: {formatKennelDate(litter.actual_date)}</Typography>
          <Typography variant="body">Go home: {goHomeLine || '—'}</Typography>
          <Typography variant="body">Puppies: {puppies.length}</Typography>
        </Card>
        <Typography variant="label" className="mt-6 mb-2 text-gold">PUPPIES</Typography>
        {puppies.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/(tabs)/dogs/${p.id}` as never)}>
            <Card className="mb-2">
              <Typography variant="body">{p.name}</Typography>
              <Typography variant="caption" className="text-subtle">{p.status}</Typography>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
