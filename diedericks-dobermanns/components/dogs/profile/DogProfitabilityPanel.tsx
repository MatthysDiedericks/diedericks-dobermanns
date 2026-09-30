import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  expenseShareSentence,
  formatMoneyFigure,
  type DogProfitability,
} from '@/lib/finance/dogProfitability';
import { formatAmount } from '@/lib/finance/formatters';
import { loadDogProfitability } from '@/lib/finance/loadDogProfitability';
import { isBreedingDog } from '@/lib/dogs/breeding';
import { requireSupabase } from '@/lib/supabase';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1 flex-row items-start justify-between gap-3">
      <Typography variant="caption" className="flex-1 text-muted">
        {label}
      </Typography>
      <Typography variant="caption" className="text-right">
        {value}
      </Typography>
    </View>
  );
}

function roleLine(role: 'dam' | 'sire' | 'both', litters: number): string {
  const noun = litters === 1 ? 'litter' : 'litters';
  if (role === 'dam') return `${litters} ${noun} whelped`;
  if (role === 'sire') return `${litters} ${noun} sired`;
  return `${litters} ${noun} whelped or sired`;
}

export function DogProfitabilityPanel({
  dogId,
  status,
}: {
  dogId: string;
  status?: string | null;
}) {
  const router = useRouter();
  const [model, setModel] = useState<DogProfitability | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDogProfitability(requireSupabase(), dogId)
      .then((next) => {
        if (!cancelled) setModel(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load money.');
      });
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  if (error) {
    return (
      <Typography variant="caption" className="mb-4 text-danger">
        {error}
      </Typography>
    );
  }
  if (!model) return null;
  const shares = model.expenseLines.filter((line) => line.kind === 'selected' && line.column === 'direct');
  if (!isBreedingDog({ status, hasProducedLitter: model.attributed != null }) && shares.length === 0) {
    return null;
  }

  const attributed = model.attributed;
  return (
    <View className="mb-4">
      <Card className="mb-3">
        <Typography variant="label" className="mb-2">
          Direct — this dog
        </Typography>
        <Row label="Bought for" value={formatMoneyFigure(model.direct.bought, formatAmount)} />
        <Row label="Sold for · invoiced" value={formatMoneyFigure(model.direct.sold, formatAmount)} />
        <Row label="Sold for · received" value={formatMoneyFigure(model.direct.soldReceived, formatAmount)} />
        <Row label="Sold for · outstanding" value={formatMoneyFigure(model.direct.soldOutstanding, formatAmount)} />
        <Row label="Costs allocated to this dog" value={formatAmount(model.direct.costs)} />
        {shares.map((line) => {
          const sentence = expenseShareSentence(
            {
              amount: line.amount,
              description: line.description,
              kind: line.kind,
              basis: line.basis,
              sourceAmount: line.sourceAmount,
            },
            formatAmount,
          );
          return sentence ? (
            <Typography key={line.id} variant="caption" className="mt-1 text-muted">
              {sentence}
            </Typography>
          ) : null;
        })}
      </Card>
      <Card>
        <Typography variant="label" className="mb-2">
          Attributed — progeny
        </Typography>
        {attributed ? (
          <>
            <Typography variant="caption" className="mb-2 text-muted">
              {roleLine(attributed.role, attributed.litters)}
            </Typography>
            <Row label="Puppies born" value={String(attributed.born)} />
            <Row label="Alive" value={String(attributed.alive)} />
            <Row label="Sold" value={String(attributed.sold)} />
            <Row label="Retained" value={String(attributed.retained)} />
            <Row label="Invoiced" value={formatMoneyFigure(attributed.invoiced, formatAmount)} />
            <Row label="Received" value={formatMoneyFigure(attributed.received, formatAmount)} />
            <Row label="Outstanding" value={formatMoneyFigure(attributed.outstanding, formatAmount)} />
            <Row label="Costs allocated to those litters" value={formatAmount(attributed.litterCosts)} />
            <Row label={attributed.netLabel} value={formatMoneyFigure(attributed.net, formatAmount)} />
            <Pressable onPress={() => router.push('/(admin)/finance/link-sales' as never)} className="mt-2">
              <Typography variant="caption" className="text-gold">
                {attributed.coverage}
              </Typography>
            </Pressable>
          </>
        ) : (
          <Typography variant="caption" className="text-muted">
            No litters yet
          </Typography>
        )}
      </Card>
      <Pressable onPress={() => router.push(`/(admin)/dogs/${dogId}/profitability`)} className="mt-2">
        <Typography variant="caption" className="text-gold">
          Full report
        </Typography>
      </Pressable>
      <Typography variant="caption" className="mt-1 text-muted">
        Direct and attributed are kept apart.
      </Typography>
    </View>
  );
}
