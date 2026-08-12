import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { claimMyRecords } from '@/lib/claimMyRecords';
import { formatAmount, formatDate, humanizeStatus } from '@/lib/finance/formatters';
import {
  fetchMyClientQuotes,
  type ClientQuoteListRow,
} from '@/lib/portal/clientQuotes';

export default function ClientQuotesScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<ClientQuoteListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await claimMyRecords();
        const rows = await fetchMyClientQuotes();
        if (!cancelled) setQuotes(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load quotes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="My quotes" />
      <Typography variant="bodyMuted" className="mb-4 px-6">
        The same quotations emailed to you — open one to view or share the PDF.
      </Typography>

      {loading ? <CardListSkeleton count={3} /> : null}
      {error ? (
        <Typography variant="bodyMuted" className="px-6">
          {error}
        </Typography>
      ) : null}

      <View className="gap-3 px-6">
        {!loading && quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            message="When a quotation is sent to you, it will appear here."
          />
        ) : null}
        {quotes.map((q) => (
          <Pressable
            key={q.id}
            onPress={() => router.push(`/(portal)/quotes/${q.id}` as Href)}
          >
            <Card className="gap-2 p-4">
              <View className="flex-row items-center justify-between">
                <Typography variant="subtitle" className="text-gold">
                  {q.quote_number}
                </Typography>
                <Typography variant="label">{humanizeStatus(q.status)}</Typography>
              </View>
              <Typography variant="body">{formatAmount(q.total)}</Typography>
              <Typography variant="caption">
                {formatDate(q.sent_at ?? q.created_at)}
                {q.valid_until ? ` · Valid until ${formatDate(q.valid_until)}` : ''}
              </Typography>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}
