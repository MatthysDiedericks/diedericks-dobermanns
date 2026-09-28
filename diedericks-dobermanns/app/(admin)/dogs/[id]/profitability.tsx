import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import {
  buildDogProfitability,
  formatMoneyFigure,
  type ProfitInput,
} from '@/lib/finance/dogProfitability';
import { csvEscape } from '@/lib/finance/cashflow/format';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { loadProfitInput } from '@/lib/finance/loadDogProfitability';
import { requireSupabase } from '@/lib/supabase';

export default function DogProfitabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [input, setInput] = useState<ProfitInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | 'all'>('all');
  const [litterId, setLitterId] = useState<string | 'all'>('all');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadProfitInput(requireSupabase(), id)
      .then((next) => {
        if (!cancelled) setInput(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the report.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const years = useMemo(() => {
    if (!input) return [];
    const found = new Set<number>();
    const dates = [
      ...input.invoices.map((row) => row.issueDate),
      ...input.historical.map((row) => row.date),
      ...input.allocations.map((row) => row.date),
    ];
    for (const date of dates) {
      const value = Number(date?.slice(0, 4));
      if (value) found.add(value);
    }
    return [...found].sort((a, b) => b - a);
  }, [input]);

  const model = useMemo(
    () => (input ? buildDogProfitability(input, { year, litterId }) : null),
    [input, year, litterId],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Dog" title="Money" />
      <ScrollView className="px-6 pb-10">
        {error ? <Typography variant="body">{error}</Typography> : null}
        {input && model ? (
          <>
            <ScrollView horizontal className="mb-3">
              <Pressable onPress={() => setYear('all')} className="mr-2 rounded-full border border-gold/30 px-3 py-1">
                <Typography variant="caption">All time</Typography>
              </Pressable>
              {years.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setYear(value)}
                  className="mr-2 rounded-full border border-gold/30 px-3 py-1"
                >
                  <Typography variant="caption">{value}</Typography>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal className="mb-4">
              <Pressable onPress={() => setLitterId('all')} className="mr-2 rounded-full border border-gold/30 px-3 py-1">
                <Typography variant="caption">All litters</Typography>
              </Pressable>
              {input.litters.map((litter) => (
                <Pressable
                  key={litter.id}
                  onPress={() => setLitterId(litter.id)}
                  className="mr-2 rounded-full border border-gold/30 px-3 py-1"
                >
                  <Typography variant="caption">{litter.name?.trim() || 'Litter'}</Typography>
                </Pressable>
              ))}
            </ScrollView>
            <Typography variant="caption" className="mb-4 text-gold">
              {model.coverage}
            </Typography>
            <Pressable
              onPress={() => {
                const headers = ['column', 'type', 'date', 'party', 'dog', 'litter', 'kind', 'basis', 'amount'];
                const rows = [
                  ...model.incomeLines.map((line) => [
                    line.dogId === input.dog.id ? 'direct' : 'attributed',
                    line.source,
                    line.date ?? '',
                    line.buyer,
                    line.dogName,
                    line.litterName ?? '',
                    '',
                    '',
                    line.amount.toFixed(2),
                  ]),
                  ...model.expenseLines.map((line) => [
                    line.column === 'direct' ? 'direct' : 'attributed',
                    'expense',
                    line.date ?? '',
                    line.description,
                    '',
                    line.litterName ?? '',
                    line.kind,
                    line.basis ?? '',
                    line.amount.toFixed(2),
                  ]),
                ];
                const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
                void Share.share({ message: csv });
              }}
              className="mb-4"
            >
              <Typography variant="caption" className="text-gold">
                Export CSV
              </Typography>
            </Pressable>
            {model.litterBreakdown.map((row) => (
              <Card key={row.litterId} className="mb-3">
                <Typography variant="label">{row.label}</Typography>
                <Typography variant="caption" className="mt-1">
                  {row.born} born · {row.alive} alive · {row.sold} sold · {row.linkedSales} linked
                </Typography>
                <Typography variant="caption" className="mt-2">
                  Income {formatMoneyFigure(row.income, formatAmount)}
                </Typography>
                <Typography variant="caption">Direct costs {formatAmount(row.directCosts)}</Typography>
                <Typography variant="caption">
                  Share of shared costs {formatAmount(row.sharedCosts)}
                </Typography>
                <Typography variant="caption">Net {formatMoneyFigure(row.net, formatAmount)}</Typography>
                <Typography variant="caption">
                  Cost per puppy raised{' '}
                  {row.costPerPuppyRaised == null ? '—' : formatAmount(row.costPerPuppyRaised)}
                </Typography>
              </Card>
            ))}
            <Typography variant="label" className="mb-2 mt-2">
              Income
            </Typography>
            {model.incomeLines.length === 0 ? (
              <Typography variant="caption" className="mb-4 text-muted">
                No linked income in this view.
              </Typography>
            ) : (
              model.incomeLines.map((line) => (
                <View key={`${line.source}-${line.id}`} className="mb-2">
                  <Typography variant="body">
                    {formatDate(line.date)} · {line.dogName} · {formatAmount(line.amount)}
                  </Typography>
                  <Typography variant="caption" className="text-muted">
                    {line.buyer}
                  </Typography>
                </View>
              ))
            )}
            <Typography variant="label" className="mb-2 mt-4">
              Expenses
            </Typography>
            {model.expenseLines.map((line) => (
              <View key={line.id} className="mb-2">
                <Typography variant="body">
                  {formatDate(line.date)} · {line.description} · {formatAmount(line.amount)}
                </Typography>
                <Typography variant="caption" className="text-muted">
                  {line.kind}
                  {line.basis ? ` · ${line.basis}` : ''}
                </Typography>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
