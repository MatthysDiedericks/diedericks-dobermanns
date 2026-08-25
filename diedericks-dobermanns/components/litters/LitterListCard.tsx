import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LitterInlinePuppies } from '@/components/litters/LitterInlinePuppies';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { isActiveLitter, type LitterIndexRow } from '@/hooks/useLittersIndex';
import { formatKennelDate, formatPuppyAge } from '@/lib/kennel/formatters';
import {
  formatLitterCount,
  litterHasRecordedPuppies,
  type DerivedLitterCount,
} from '@/lib/litters/derivedCounts';

export function LitterListCard({
  litter,
  count,
  highlightQuery,
  autoExpand = false,
}: {
  litter: LitterIndexRow;
  count: DerivedLitterCount;
  highlightQuery?: string;
  autoExpand?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoExpand);
  const hasPuppies = litterHasRecordedPuppies(count);
  const letter = litter.litter_letter ? `Litter ${litter.litter_letter}` : litter.name ?? 'Litter';
  const dateLabel = litter.actual_date ?? litter.expected_date;
  const label = formatLitterCount(count);
  const active = isActiveLitter(litter.status);

  return (
    <View className="mb-8">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="min-w-0 flex-1 flex-row items-start pr-2">
          {hasPuppies ? (
            <Pressable
              onPress={() => setOpen((v) => !v)}
              accessibilityLabel={open ? 'Hide puppies' : 'Show puppies'}
              className="mr-2 pt-1"
            >
              <Typography variant="label" className="text-gold">
                {open ? '▾' : '▸'}
              </Typography>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push(`/(admin)/litters/${litter.id}` as never)}
            className="min-w-0 flex-1"
          >
            <Typography variant="subtitle">
              {formatKennelDate(dateLabel)}
              {litter.go_home_date
                ? ` (${formatPuppyAge(litter.actual_date)} · home ${formatKennelDate(litter.go_home_date)})`
                : ''}
            </Typography>
            <Typography variant="bodyMuted">{letter}</Typography>
            <Typography variant="bodyMuted">
              Dam: {litter.mother?.name ?? '—'} · Sire: {litter.father?.name ?? '—'}
            </Typography>
          </Pressable>
        </View>
        <View className="items-end gap-2">
          {active ? <Badge label="ACTIVE" tone="gold" /> : null}
          {!active && litter.status === 'expected' ? <Badge label="EXPECTED" tone="muted" /> : null}
          {hasPuppies ? (
            <Pressable
              onPress={() =>
                router.push(`/(admin)/litters/${litter.id}?tab=puppies` as never)
              }
            >
              <Typography variant="label" className="text-gold">
                {label}
                {count.mismatch ? ' ≠' : ''}
              </Typography>
            </Pressable>
          ) : (
            <Typography variant="caption" className="text-subtle">
              {label}
            </Typography>
          )}
          <Pressable onPress={() => router.push(`/(admin)/litters/${litter.id}` as never)}>
            <Typography variant="label" className="text-gold">
              Open →
            </Typography>
          </Pressable>
        </View>
      </View>
      {open ? (
        <LitterInlinePuppies litterId={litter.id} highlightQuery={highlightQuery} />
      ) : null}
    </View>
  );
}
