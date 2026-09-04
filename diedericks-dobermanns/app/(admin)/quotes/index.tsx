import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuoteListCard } from '@/components/finance/QuoteListCard';
import { QuotesListTotals } from '@/components/finance/QuotesListTotals';
import { QuoteStatusChips, countQuoteStatuses, type QuoteStatusFilter } from '@/components/finance/QuoteStatusChips';
import { RevenueTypeChips } from '@/components/finance/RevenueTypeChips';
import { PageHeader } from '@/components/layout/PageHeader';
import { type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useQuotes } from '@/hooks/useQuotes';
import { useRevenueTypeFilter } from '@/hooks/useRevenueTypeFilter';
import { compareBalanceDue, outstandingSummaryLine, quoteListMoneyTotals } from '@/lib/finance/quoteBalance';
import { quoteBuyerName, quoteStatusRank } from '@/lib/finance/quoteBuyerDisplay';
import { matchesRevenueTypeFilter } from '@/lib/finance/quoteTypes';
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

type SortKey = 'newest' | 'status' | 'total' | 'balance';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'balance', label: 'Balance' },
];

export default function AdminQuotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: quotes, loading, refresh } = useQuotes();
  const { filter, setFilter } = useRevenueTypeFilter();
  const [status, setStatus] = useState<QuoteStatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const statusCounts = useMemo(() => countQuoteStatuses(quotes), [quotes]);

  const shown = useMemo(() => {
    const rows = quotes.filter((q) => {
      if (!matchesRevenueTypeFilter(q.quote_type, filter)) return false;
      if (status !== 'all' && q.status !== status) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === 'total') return Number(b.total) - Number(a.total);
      if (sort === 'balance') {
        return compareBalanceDue(a.invoiceOutstanding ?? null, b.invoiceOutstanding ?? null);
      }
      if (sort === 'status') return quoteStatusRank(a.status) - quoteStatusRank(b.status);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [quotes, filter, status, sort]);

  const moneyTotals = useMemo(() => quoteListMoneyTotals(shown), [shown]);
  const outstandingLine = outstandingSummaryLine(moneyTotals.owingCount, moneyTotals.balance);
  const headerOutstanding = useMemo(() => {
    const all = quoteListMoneyTotals(quotes);
    return outstandingSummaryLine(all.owingCount, all.balance);
  }, [quotes]);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Sales" title="Quotes" back={false} />

      <View className="mb-3 px-6">
        <Button label="+ New Quote" onPress={() => router.push('/(admin)/quotes/new')} fullWidth />
        {headerOutstanding ? (
          <Typography variant="caption" className="mt-3 text-gold">
            {headerOutstanding}
          </Typography>
        ) : null}
        <QuoteStatusChips value={status} onChange={setStatus} counts={statusCounts} />
        <RevenueTypeChips value={filter} onChange={setFilter} />
        <View className="mb-2 mt-1 flex-row flex-wrap items-center gap-3">
          <Typography variant="caption" className="text-silver">
            Sort:
          </Typography>
          {SORTS.map((s) => (
            <Pressable key={s.key} onPress={() => setSort(s.key)}>
              <Typography variant="caption" className={sort === s.key ? 'text-gold' : 'text-silver'}>
                {s.label}
              </Typography>
            </Pressable>
          ))}
        </View>
        {outstandingLine && (status !== 'all' || filter !== 'all') ? (
          <Typography variant="caption" className="mb-2 text-gold">
            {outstandingLine}
          </Typography>
        ) : null}
      </View>

      {loading && quotes.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={4} />
        </View>
      ) : !loading && shown.length === 0 ? (
        <View className="px-6">
          <EmptyState title="No quotes yet" message="Build a quote for an approved client to get started." />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 gap-3"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <QuoteListCard quote={item} onChanged={() => void refresh()} />
          )}
          ListFooterComponent={shown.length > 0 ? <QuotesListTotals rows={shown} /> : null}
        />
      )}
    </ScreenContainer>
  );
}
