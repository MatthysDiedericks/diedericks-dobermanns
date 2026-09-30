import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatMoneyFigure, type LitterSummary, type MoneyFigure } from '@/lib/finance/dogProfitability';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { loadLitterFinancials, type LitterFinancials } from '@/lib/finance/loadLitterReport';
import { requireSupabase } from '@/lib/supabase';

function figureText(figure: MoneyFigure): string {
  return formatMoneyFigure(figure, formatAmount);
}

function Stat({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Card className="mb-2">
      <Typography variant="caption" className="text-muted">
        {label}
      </Typography>
      <Typography variant="label" className={emphasize ? 'mt-1 text-amber-300' : 'mt-1'}>
        {value}
      </Typography>
    </Card>
  );
}

/**
 * Litter money from expense_allocations and invoices on the puppies.
 * litter_transactions is unused and is not queried.
 */
export function LitterFinancialsTab({
  litterId,
}: {
  litterId: string;
  litterName?: string;
}) {
  const [data, setData] = useState<LitterFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLitterFinancials(requireSupabase(), litterId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load financials.');
      });
    return () => {
      cancelled = true;
    };
  }, [litterId]);

  if (error) {
    return (
      <Typography variant="caption" className="text-danger">
        {error}
      </Typography>
    );
  }
  if (!data) {
    return <Typography variant="caption">Loading financials…</Typography>;
  }
  const summary: LitterSummary = data.summary;
  return (
    <View>
      <Typography variant="caption" className="mb-3 text-gold">
        {summary.coverage}
      </Typography>
      <Stat label="Invoiced" value={figureText(summary.invoiced)} />
      <Stat label="Received" value={figureText(summary.received)} />
      <Stat
        label="Outstanding"
        value={figureText(summary.outstanding)}
        emphasize={summary.outstanding.kind === 'amount' && Math.abs(summary.outstanding.amount) > 0.009}
      />
      <Stat label="Cost" value={formatAmount(summary.cost)} />
      <Stat label="Net (on money received)" value={figureText(summary.net)} />
      <Typography variant="label" className="mb-2 mt-2">
        Allocations · {data.allocations.length}
      </Typography>
      {data.allocations.length === 0 ? (
        <Typography variant="caption" className="text-muted">
          No costs allocated to this litter yet.
        </Typography>
      ) : (
        data.allocations.map((row) => (
          <Card key={row.id} className="mb-2">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Typography variant="body">{row.description}</Typography>
                <Typography variant="caption" className="text-muted">
                  {formatDate(row.date)}
                </Typography>
              </View>
              <Typography variant="label">{formatAmount(row.amount)}</Typography>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}
