import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { QuoteListCard } from '@/components/finance/QuoteListCard';
import { QuoteStatusChips, countQuoteStatuses, type QuoteStatusFilter } from '@/components/finance/QuoteStatusChips';
import { RevenueTypeChips } from '@/components/finance/RevenueTypeChips';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { useQuotes } from '@/hooks/useQuotes';
import { useRevenueTypeFilter } from '@/hooks/useRevenueTypeFilter';
import { matchesRevenueTypeFilter } from '@/lib/finance/quoteTypes';
import { quoteBuyerName } from '@/lib/finance/quoteBuyerDisplay';
import type { Quote, QuoteStatus } from '@/types/app.types';

export const QUOTE_TONE: Record<QuoteStatus, BadgeTone> = {
  draft: 'muted',
  sent: 'gold',
  accepted: 'success',
  declined: 'danger',
  expired: 'danger',
  cancelled: 'danger',
};

export function quoteClientLabel(quote: Quote): string {
  return quoteBuyerName(quote);
}

export default function AdminQuotesScreen() {
  const router = useRouter();
  const { data: quotes, loading, refresh } = useQuotes();
  const { filter, setFilter } = useRevenueTypeFilter();
  const [status, setStatus] = useState<QuoteStatusFilter>('all');
  const statusCounts = useMemo(() => countQuoteStatuses(quotes), [quotes]);
  const shown = quotes.filter((q) => {
    if (!matchesRevenueTypeFilter(q.quote_type, filter)) return false;
    if (status !== 'all' && q.status !== status) return false;
    return true;
  });

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Sales" title="Quotes" back={false} />

      <View className="mb-4 px-6">
        <Button
          label="+ New Quote"
          onPress={() => router.push('/(admin)/quotes/new')}
          fullWidth
        />
      </View>
      <View className="px-6">
        <QuoteStatusChips value={status} onChange={setStatus} counts={statusCounts} />
        <RevenueTypeChips value={filter} onChange={setFilter} />
      </View>

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading && shown.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            message="Build a quote for an approved client to get started."
          />
        ) : loading ? null : (
          shown.map((quote) => (
            <QuoteListCard key={quote.id} quote={quote} onChanged={() => void refresh()} />
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
