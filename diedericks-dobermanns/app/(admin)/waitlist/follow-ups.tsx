import { useRouter } from 'expo-router';

import { FollowUpList } from '@/components/waitlist/FollowUpList';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { useFollowUps } from '@/hooks/useFollowUps';

export default function WaitlistFollowUpsScreen() {
  const router = useRouter();
  const { grouped, loading, refresh } = useFollowUps();
  const total = grouped.overdue.length + grouped.today.length + grouped.week.length;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Waiting List" title="Follow-ups" />
      {loading ? <CardListSkeleton count={3} /> : null}
      {!loading && total === 0 ? (
        <EmptyState title="All caught up" message="No follow-ups due today or this week." />
      ) : (
        <FollowUpList
          grouped={grouped}
          onRefresh={refresh}
          onSelect={(e) => router.push({ pathname: '/(admin)/waitlist/[id]', params: { id: e.id } })}
        />
      )}
    </ScreenContainer>
  );
}
