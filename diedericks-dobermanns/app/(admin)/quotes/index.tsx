import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { QuoteListCard } from '@/components/finance/QuoteListCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { useQuotes } from '@/hooks/useQuotes';
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

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading && quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            message="Build a quote for an approved client to get started."
          />
        ) : loading ? null : (
          quotes.map((quote) => (
            <QuoteListCard key={quote.id} quote={quote} onChanged={() => void refresh()} />
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
