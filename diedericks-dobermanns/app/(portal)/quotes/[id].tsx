import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { shareClientQuotePdf } from '@/lib/finance/clientQuotePdf';
import { formatAmount, formatDate, humanizeStatus } from '@/lib/finance/formatters';
import { fetchQuoteRevisions, type QuoteRevisionRow } from '@/lib/finance/quoteRevisions';
import {
  fetchMyClientQuoteById,
  type ClientQuoteDetail,
} from '@/lib/portal/clientQuotes';
import { useAuthStore } from '@/stores/authStore';

export default function ClientQuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id ?? s.profile?.id);
  const [quote, setQuote] = useState<ClientQuoteDetail | null>(null);
  const [snapshot, setSnapshot] = useState<QuoteRevisionRow['snapshot'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchMyClientQuoteById(id, userId);
        if (cancelled) return;
        setQuote(row);
        if (row?.last_sent_revision) {
          const revs = await fetchQuoteRevisions(id);
          const match = revs.find((r) => r.revision === row.last_sent_revision);
          if (!cancelled) setSnapshot(match?.snapshot ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load quote.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  const items = snapshot?.items ?? quote?.items ?? [];
  const total = Number(snapshot?.total ?? quote?.total ?? 0);

  const onShare = async () => {
    if (!quote) return;
    setSharing(true);
    try {
      await shareClientQuotePdf(quote, snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open PDF.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Quote"
        title={quote?.quote_number ?? 'Quote'}
      />
      {quote ? (
        <Typography variant="label" className="mb-2 px-6">
          {humanizeStatus(quote.status)}
        </Typography>
      ) : null}

      {loading ? (
        <Typography variant="bodyMuted" className="px-6">
          Loading…
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="bodyMuted" className="px-6">
          {error}
        </Typography>
      ) : null}
      {!loading && !quote ? (
        <EmptyState title="Not found" message="This quote is not available in your portal." />
      ) : null}

      {quote ? (
        <View className="gap-4 px-6">
          <Card className="gap-2 p-4">
            <Typography variant="caption">
              {formatDate(quote.sent_at ?? quote.created_at)}
              {quote.valid_until ? ` · Valid until ${formatDate(quote.valid_until)}` : ''}
            </Typography>
            <Typography variant="displayLg" className="text-gold">
              {formatAmount(total)}
            </Typography>
            {(quote.last_sent_revision ?? 1) > 1 ? (
              <Typography variant="caption" className="text-gold">
                Showing revision {quote.last_sent_revision}
              </Typography>
            ) : null}
          </Card>

          <Card className="gap-3 p-4">
            {items.map((it, i) => (
              <View key={`${it.description}-${i}`} className="flex-row justify-between gap-3">
                <Typography variant="body" className="flex-1">
                  {it.description}
                </Typography>
                <Typography variant="body">
                  {formatAmount(Number(it.line_total))}
                </Typography>
              </View>
            ))}
          </Card>

          <Pressable
            onPress={() => void onShare()}
            disabled={sharing}
            className="items-center rounded-xl border border-gold bg-gold/15 px-4 py-3"
          >
            <Typography variant="subtitle" className="text-gold">
              {sharing ? 'Preparing PDF…' : 'Open / share PDF'}
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
