import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { linkIncomeToLitter } from '@/lib/finance/linkSale';
import { litterProgressLabel, shortlistSaleLitters, type SaleLitter } from '@/lib/finance/litterCandidates';
import { loadLinkSales, type LinkSalesData } from '@/lib/finance/loadLinkSales';
import { requireSupabase } from '@/lib/supabase';

export default function LinkSalesScreen() {
  const [data, setData] = useState<LinkSalesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeOther, setIncludeOther] = useState(false);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [openLitter, setOpenLitter] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadLinkSales(requireSupabase())
      .then((next) => {
        setData(next);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load unlinked income.');
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const queue = useMemo(
    () => (data?.items ?? []).filter((item) => includeOther || item.dogSale),
    [data, includeOther],
  );
  const safeIndex = queue.length === 0 ? 0 : Math.min(index, queue.length - 1);
  const current = queue[safeIndex];
  const shortlist = useMemo(
    () => (current && data ? shortlistSaleLitters(current.date, data.litters) : { inWindow: [], outside: [] }),
    [current, data],
  );

  async function choose(litterId: string, dogId: string | null) {
    if (!current) return;
    setPending(true);
    setError(null);
    const result = await linkIncomeToLitter(requireSupabase(), current.source, current.id, litterId, dogId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpenLitter(null);
    reload();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Link sales" />
      <ScrollView className="px-6 pb-10">
        <Typography variant="caption" className="mb-4 text-muted">
          Income with no litter, largest first. Pick the litter whelped 8 to 16 weeks before the
          payment. A puppy is optional.
        </Typography>
        {data ? (
          <Typography variant="label" className="mb-4 text-gold">
            {litterProgressLabel(data.litterProgress.linked, data.litterProgress.total)}
          </Typography>
        ) : null}
        <Pressable
          onPress={() => {
            setIncludeOther((value) => !value);
            setIndex(0);
          }}
          className="mb-4"
        >
          <Typography variant="caption">
            {includeOther ? 'Showing every invoice' : 'Showing dog sales and historical income'}
          </Typography>
        </Pressable>
        {error ? (
          <Typography variant="caption" className="mb-3 text-danger">
            {error}
          </Typography>
        ) : null}
        {current && data ? (
          <View>
            <Card className="mb-3">
              <Typography variant="caption" className="text-muted">
                {safeIndex + 1} of {queue.length}
              </Typography>
              <Typography variant="title" className="mt-2 text-gold">
                {formatAmount(current.amount)}
              </Typography>
              <Typography variant="body" className="mt-1">
                {current.buyer}
              </Typography>
              <Typography variant="caption" className="mt-1 text-muted">
                {formatDate(current.date)} · {current.label}
                {current.source === 'historical' ? ' · historical' : ''}
              </Typography>
              <View className="mt-3 flex-row gap-2">
                <Button
                  label="Previous"
                  variant="ghost"
                  disabled={safeIndex === 0}
                  onPress={() => setIndex((value) => Math.max(0, value - 1))}
                />
                <Button label="Skip" variant="ghost" onPress={() => setIndex((value) => value + 1)} />
              </View>
            </Card>
            <Typography variant="label" className="mb-2">
              Litters whelped 8 to 16 weeks before
            </Typography>
            <LitterChoices
              litters={shortlist.inWindow}
              data={data}
              openLitter={openLitter}
              setOpenLitter={setOpenLitter}
              pending={pending}
              onChoose={choose}
              empty="No litter whelped in that window."
            />
            {shortlist.outside.length > 0 ? (
              <>
                <Typography variant="label" className="mb-2 mt-4">
                  Outside that window
                </Typography>
                <LitterChoices
                  litters={shortlist.outside}
                  data={data}
                  openLitter={openLitter}
                  setOpenLitter={setOpenLitter}
                  pending={pending}
                  onChoose={choose}
                  empty=""
                />
              </>
            ) : null}
          </View>
        ) : (
          <Typography variant="body" className="text-muted">
            {data ? 'No unlinked income in this list.' : 'Loading…'}
          </Typography>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function LitterChoices({
  litters,
  data,
  openLitter,
  setOpenLitter,
  pending,
  onChoose,
  empty,
}: {
  litters: SaleLitter[];
  data: LinkSalesData;
  openLitter: string | null;
  setOpenLitter: (id: string | null) => void;
  pending: boolean;
  onChoose: (litterId: string, dogId: string | null) => void;
  empty: string;
}) {
  if (litters.length === 0) {
    return empty ? (
      <Typography variant="caption" className="mb-2 text-muted">
        {empty}
      </Typography>
    ) : null;
  }
  return (
    <View>
      {litters.map((litter) => {
        const pups = data.puppies.filter((puppy) => puppy.litterId === litter.id);
        const open = openLitter === litter.id;
        return (
          <View key={litter.id} className="mb-3">
            <Button
              label={`${litter.name} · ${litter.damName} × ${litter.sireName}`}
              loading={pending}
              onPress={() => onChoose(litter.id, null)}
            />
            <Typography variant="caption" className="mt-1 text-muted">
              {litter.whelpDate ? `Whelped ${formatDate(litter.whelpDate)}` : 'Whelp date unknown'}
              {litter.sold > 0 ? ` · ${litter.sold} sold` : ''}
              {litter.linked ? ' · income already linked' : ''}
            </Typography>
            {pups.length > 0 ? (
              <Pressable onPress={() => setOpenLitter(open ? null : litter.id)} className="mt-1">
                <Typography variant="caption" className="text-gold">
                  {open ? 'Hide puppies' : 'Name a puppy'}
                </Typography>
              </Pressable>
            ) : null}
            {open
              ? pups.map((puppy) => (
                  <Pressable
                    key={puppy.id}
                    disabled={pending}
                    onPress={() => onChoose(litter.id, puppy.id)}
                    className="mt-1"
                  >
                    <Typography variant="caption">{puppy.name}</Typography>
                  </Pressable>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}
