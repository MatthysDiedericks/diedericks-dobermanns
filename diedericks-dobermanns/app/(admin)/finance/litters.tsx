import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatMoneyFigure } from '@/lib/finance/dogProfitability';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { linkIncomeToLitter } from '@/lib/finance/linkSale';
import {
  buildDamLifetimes,
  buildDamSeries,
  buildLitterLeague,
  exactNameCensus,
  excludedDamNote,
  programmeCoverage,
  suggestExactNameLinks,
  type LitterReportInput,
  type RejectedPair,
} from '@/lib/finance/litterReport';
import { loadLitterReport } from '@/lib/finance/loadLitterReport';
import { requireSupabase } from '@/lib/supabase';

export default function LitterReportScreen() {
  const [input, setInput] = useState<LitterReportInput | null>(null);
  const [rejected, setRejected] = useState<RejectedPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortNet, setSortNet] = useState(false);
  const [chartMode, setChartMode] = useState<'year' | 'cumulative'>('year');

  const reload = useCallback(() => {
    loadLitterReport(requireSupabase())
      .then((loaded) => {
        setInput(loaded.input);
        setRejected(loaded.rejected);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load the litter report.');
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const rows = useMemo(() => (input ? buildLitterLeague(input) : []), [input]);
  const dams = useMemo(() => buildDamLifetimes(rows), [rows]);
  const series = useMemo(() => buildDamSeries(rows, dams), [rows, dams]);
  const coverage = programmeCoverage(rows);
  const suggestions = useMemo(
    () => (input ? suggestExactNameLinks(input, rejected) : []),
    [input, rejected],
  );
  const census = useMemo(() => (input ? exactNameCensus(input) : null), [input]);
  const sorted = useMemo(() => {
    const copy = [...rows];
    if (!sortNet) return copy;
    copy.sort((a, b) => {
      const left = a.netPerPuppy.kind === 'amount' ? a.netPerPuppy.amount : Number.NEGATIVE_INFINITY;
      const right = b.netPerPuppy.kind === 'amount' ? b.netPerPuppy.amount : Number.NEGATIVE_INFINITY;
      return right - left;
    });
    return copy;
  }, [rows, sortNet]);

  return (
    <ScreenContainer>
      <PageHeader title="Litter report" />
      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 48 }}>
        {error ? (
          <Typography variant="caption" className="mb-4 text-danger">
            {error}
          </Typography>
        ) : null}
        {!input && !error ? <Typography variant="caption">Loading…</Typography> : null}
        {input ? (
          <>
            <Card className="mb-4">
              <Typography variant="caption" className="text-gold">
                {coverage.text}
              </Typography>
              <Typography variant="caption" className="mt-1 text-subtle">
                All years. Net is on money received.
              </Typography>
            </Card>
            <Pressable onPress={() => setSortNet((value) => !value)} className="mb-3">
              <Typography variant="caption" className="text-gold">
                {sortNet ? 'Showing net per puppy' : 'Showing newest first'}
              </Typography>
            </Pressable>
            {sorted.map((row) => (
              <Card key={row.litterId} className="mb-3">
                <Typography variant="label">
                  {row.damName} × {row.sireName}
                </Typography>
                <Typography variant="caption" className="text-muted">
                  {formatDate(row.whelpDate)} · {row.born} born · {row.sold} sold
                </Typography>
                <Typography variant="caption" className="mt-1">
                  Invoiced {formatMoneyFigure(row.invoiced, formatAmount)}
                </Typography>
                <Typography variant="caption">
                  Received {formatMoneyFigure(row.received, formatAmount)}
                </Typography>
                <Typography variant="caption">
                  Outstanding {formatMoneyFigure(row.outstanding, formatAmount)}
                </Typography>
                <Typography variant="caption">Cost {formatAmount(row.cost)}</Typography>
                <Typography variant="caption">
                  Net (on money received) {formatMoneyFigure(row.net, formatAmount)}
                </Typography>
                <Typography variant="caption">
                  Net per puppy {formatMoneyFigure(row.netPerPuppy, formatAmount)}
                </Typography>
                <Typography variant="caption" className="mt-1 text-subtle">
                  {row.coverage}
                </Typography>
              </Card>
            ))}
            <Typography variant="label" className="mb-2 mt-4">
              Females
            </Typography>
            <View className="mb-2 flex-row gap-4">
              <Pressable onPress={() => setChartMode('year')}>
                <Typography variant="caption" className={chartMode === 'year' ? 'text-gold' : 'text-muted'}>
                  Income per year
                </Typography>
              </Pressable>
              <Pressable onPress={() => setChartMode('cumulative')}>
                <Typography variant="caption" className={chartMode === 'cumulative' ? 'text-gold' : 'text-muted'}>
                  Cumulative
                </Typography>
              </Pressable>
            </View>
            <Typography variant="caption" className="mb-2 text-subtle">
              {excludedDamNote(dams) || 'Every dam with sales is linked far enough to draw.'}
            </Typography>
            {series.length === 0 ? (
              <Typography variant="caption" className="mb-4 text-subtle">
                No dam has income linked for at least 80% of puppies sold, so none is drawn.
              </Typography>
            ) : (
              series.map((line) => (
                <Card key={line.damId} className="mb-2">
                  <Typography variant="label">{line.damName}</Typography>
                  {(chartMode === 'cumulative' ? line.cumulative : line.points).map((point) => (
                    <Typography key={point.year} variant="caption">
                      {point.year} ·{' '}
                      {point.received == null ? 'Not yet linked' : formatAmount(point.received)}
                    </Typography>
                  ))}
                </Card>
              ))
            )}
            <Typography variant="label" className="mb-2 mt-4">
              Lifetime per female
            </Typography>
            {dams.map((dam) => (
              <Card key={dam.damId} className="mb-2">
                <Typography variant="label">{dam.damName}</Typography>
                <Typography variant="caption" className="text-muted">
                  {dam.litters} litters · {dam.born} born · {dam.sold} sold
                </Typography>
                <Typography variant="caption">
                  Received {formatMoneyFigure(dam.received, formatAmount)}
                </Typography>
                <Typography variant="caption">Cost {formatAmount(dam.cost)}</Typography>
                <Typography variant="caption">
                  Net {formatMoneyFigure(dam.net, formatAmount)} · average{' '}
                  {formatMoneyFigure(dam.averageNetPerLitter, formatAmount)}
                </Typography>
                <Typography variant="caption" className="text-subtle">
                  {dam.coverage}
                </Typography>
              </Card>
            ))}
            <Typography variant="label" className="mb-2 mt-4">
              Linking queue
            </Typography>
            <Typography variant="caption" className="mb-3 text-muted">
              {census
                ? `${census.pairs} exact name pairs · ${census.puppies} puppies · ${census.invoices} invoices. `
                : ""}
              {suggestions.length} of those pairs are waiting below. Void invoices and puppies that already
              have income are left out. Each listed link needs a confirmation.
            </Typography>
            {suggestions.map((row) => (
              <Suggestion
                key={`${row.dogId}:${row.invoiceId}`}
                dogId={row.dogId}
                invoiceId={row.invoiceId}
                litterId={row.litterId}
                title={`${row.dogName} · ${row.damName}`}
                detail={`${row.clientName} · ${row.invoiceNumber ?? 'invoice'} · ${formatAmount(row.total)}`}
                onDone={reload}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function Suggestion({
  dogId,
  invoiceId,
  litterId,
  title,
  detail,
  onDone,
}: {
  dogId: string;
  invoiceId: string;
  litterId: string;
  title: string;
  detail: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await linkIncomeToLitter(requireSupabase(), 'invoice', invoiceId, litterId, dogId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  async function reject() {
    setPending(true);
    const { error: writeError } = await requireSupabase()
      .from('sale_link_reviews' as never)
      .insert({ dog_id: dogId, invoice_id: invoiceId, decision: 'rejected' } as never);
    setPending(false);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    onDone();
  }

  return (
    <Card className="mb-3">
      <Typography variant="body">{title}</Typography>
      <Typography variant="caption" className="text-muted">
        {detail}
      </Typography>
      <View className="mt-2 flex-row gap-4">
        <Pressable disabled={pending} onPress={() => void confirm()}>
          <Typography variant="caption" className="text-gold">
            Confirm
          </Typography>
        </Pressable>
        <Pressable disabled={pending} onPress={() => void reject()}>
          <Typography variant="caption" className="text-muted">
            Reject
          </Typography>
        </Pressable>
      </View>
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}
    </Card>
  );
}
