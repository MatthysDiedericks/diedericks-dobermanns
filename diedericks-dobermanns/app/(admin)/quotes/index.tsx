import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useQuotes } from '@/hooks/useQuotes';
import { formatPrice, titleCase } from '@/lib/format';
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
  return quote.client?.full_name ?? quote.historical_client_name ?? 'Unassigned';
}

export default function AdminQuotesScreen() {
  const router = useRouter();
  const { data: quotes, loading } = useQuotes();

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
            <Pressable
              key={quote.id}
              onPress={() => router.push({ pathname: '/(admin)/quotes/[id]', params: { id: quote.id } })}
            >
              <Card className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Typography variant="subtitle" numberOfLines={1} className="flex-1">
                      {quoteClientLabel(quote)}
                    </Typography>
                    <Badge label={titleCase(quote.status)} tone={QUOTE_TONE[quote.status]} />
                  </View>
                  <Typography variant="caption" className="mt-0.5">
                    {quote.quote_number ?? 'Draft'} · {quote.items?.length ?? 0} item
                    {(quote.items?.length ?? 0) === 1 ? '' : 's'}
                  </Typography>
                  <Typography variant="label" className="mt-2">
                    {formatPrice(quote.total)}
                  </Typography>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
