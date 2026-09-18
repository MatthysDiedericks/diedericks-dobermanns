import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { WhelpingFlow } from '@/components/litters/WhelpingFlow';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useLitterDetail } from '@/hooks/useDogs';

export default function WhelpingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const litterId = id ?? '';
  const { litter, puppies, loading, error, refresh } = useLitterDetail(litterId);
  const letter = litter?.litter_letter ?? null;

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Whelping" />
        <Typography variant="body" className="px-6">
          Loading…
        </Typography>
      </ScreenContainer>
    );
  }

  if (error || !litter) {
    return (
      <ScreenContainer>
        <PageHeader title="Whelping" />
        <Typography variant="body" className="px-6 text-danger">
          {error ?? 'Litter not found'}
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader
        eyebrow="Whelping"
        title={letter ? `Litter ${letter}` : litter.name ?? 'Litter'}
      />
      <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
        <WhelpingFlow
          litterId={litterId}
          letter={letter}
          pups={puppies}
          onSaved={() => refresh()}
          onFinished={() =>
            router.replace(`/(admin)/litters/${litterId}?tab=weights` as never)
          }
        />
      </ScrollView>
    </ScreenContainer>
  );
}
