import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { startWhelping } from '@/hooks/useMutations';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  litterGuidePhase,
  litterNextAction,
  plannedGaps,
} from '@/lib/litters/guide';

const GAP_LABEL: Record<string, string> = {
  expected_date: 'Expected date',
  litter_letter: 'Litter letter',
};

export function LitterGuideLead({
  litterId,
  status,
  puppyCount,
  expectedDate,
  litterLetter,
  actualDate,
  weighedToday = false,
}: {
  litterId: string;
  status: string | null;
  puppyCount: number;
  expectedDate: string | null;
  litterLetter: string | null;
  actualDate: string | null;
  weighedToday?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const phase = litterGuidePhase({ status, puppyCount });
  const next = litterNextAction({
    status,
    puppyCount,
    expectedDate,
    litterLetter,
    actualDate,
    weighedToday,
  });
  const gaps = plannedGaps({ expectedDate, litterLetter });

  async function start() {
    setError(null);
    setPending(true);
    const res = await startWhelping(litterId);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(`/(admin)/litters/${litterId}/whelping` as never);
  }

  if (phase === 'placed') return null;

  return (
    <View className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-4">
      <Typography variant="label" className="mb-2">
        {phase === 'planned'
          ? 'Next: get the pairing right'
          : phase === 'whelping'
            ? 'Next: record each pup'
            : 'Next: weigh them'}
      </Typography>
      <Typography variant="body" className="mb-3">
        {next}
      </Typography>
      {phase === 'planned' ? (
        <View className="mb-3">
          <Typography variant="caption">
            Expected date: {expectedDate ? formatKennelDate(expectedDate) : 'missing'}
          </Typography>
          <Typography variant="caption">
            Litter letter: {litterLetter?.trim() || 'missing'}
          </Typography>
          {gaps.map((g) => (
            <Typography key={g} variant="caption" className="text-amber-200">
              Still need: {GAP_LABEL[g]}
            </Typography>
          ))}
        </View>
      ) : null}
      {error ? (
        <Typography variant="caption" className="mb-2 text-danger">
          {error}
        </Typography>
      ) : null}
      {phase === 'planned' || phase === 'whelping' ? (
        <Button
          label={
            pending
              ? 'Opening…'
              : phase === 'planned'
                ? 'Start whelping'
                : 'Continue whelping'
          }
          onPress={() => void start()}
          loading={pending}
          fullWidth
          className="mb-2"
        />
      ) : (
        <Button
          label="Record another pup"
          variant="secondary"
          onPress={() =>
            router.push(`/(admin)/litters/${litterId}/whelping` as never)
          }
          fullWidth
          className="mb-2"
        />
      )}
      {phase === 'rearing' ? (
        <Button
          label="Growth chart →"
          variant="ghost"
          onPress={() =>
            router.push(`/(admin)/litters/${litterId}?tab=weights` as never)
          }
          fullWidth
        />
      ) : null}
    </View>
  );
}
