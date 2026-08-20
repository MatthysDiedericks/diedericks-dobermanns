import { PageHeader } from '@/components/layout/PageHeader';
import {
  CommittedLitterPanel,
  WaitingListPlainMessage,
} from '@/components/portal/CommittedLitterPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useCommittedBreeding } from '@/hooks/useCommittedBreeding';
import { usePortalWaitlistEntry } from '@/hooks/usePortal';
import { ActivityIndicator, View } from 'react-native';

export default function PortalWaitlistScreen() {
  const { entry, loading: entryLoading, error } = usePortalWaitlistEntry();
  const { parents, litter, hasPuppy, loading: breedingLoading } = useCommittedBreeding();

  if (entryLoading || breedingLoading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Your journey" title="Waiting List" />
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      </ScreenContainer>
    );
  }

  if (!entry) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Your journey" title="Waiting List" />
        <EmptyState
          title="Not on the list yet"
          message="You are not on the waiting list yet. Once approved and added, your progress will appear here."
        />
      </ScreenContainer>
    );
  }

  const showParents = parents.length > 0 && Boolean(litter) && !hasPuppy;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Your journey" title="Waiting List" />
      <View className="px-6 pb-10">
        {showParents ? (
          <CommittedLitterPanel litter={litter} parents={parents} />
        ) : hasPuppy ? (
          <Typography variant="bodyMuted">
            A puppy has been allocated to you. Open Your Dogs to see her parents, pedigree and
            progress.
          </Typography>
        ) : (
          <WaitingListPlainMessage />
        )}
      </View>
    </ScreenContainer>
  );
}
