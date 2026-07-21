import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useLitterYears, useLittersByYear } from '@/hooks/useLittersByYear';
import { titleCase } from '@/lib/format';
import { formatKennelDate, formatPuppyAge } from '@/lib/kennel/formatters';
import type { CurrentLitterRow } from '@/types/kennel';

const LITTER_STATUS_TONE: Record<string, BadgeTone> = {
  planned: 'muted',
  expected: 'gold',
  born: 'success',
  placed: 'neutral',
};

function RowArrow() {
  return <Ionicons name="chevron-forward" size={16} color={Colors.silver} />;
}

/** "Current Litters" dashboard widget — defaults to the in-progress-only list, expands into a
 * year switcher (matching the finance year-pill styling) showing every litter for that year. */
export function LittersByYearWidget({ currentLitters }: { currentLitters: CurrentLitterRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const years = useLitterYears();
  const { litters: yearLitters, loading: yearLoading } = useLittersByYear(expanded ? selectedYear : null);

  function toggleExpanded() {
    if (expanded) {
      setExpanded(false);
      setSelectedYear(null);
    } else {
      setExpanded(true);
      setSelectedYear(new Date().getFullYear());
    }
  }

  const rows = expanded ? yearLitters : currentLitters;

  return (
    <SurfaceCard title="Current Litters" href="/(admin)/litters/index">
      <View className="mb-3 flex-row items-center justify-between">
        {expanded ? (
          <View className="rounded-full border border-gold/30 px-3 py-1.5">
            <Typography variant="caption">{selectedYear ?? ''}</Typography>
          </View>
        ) : (
          <Pressable
            onPress={toggleExpanded}
            hitSlop={8}
            className="flex-row items-center gap-1 rounded-full border border-gold/30 px-3 py-1.5"
          >
            <Typography variant="caption">This year</Typography>
            <Ionicons name="chevron-down" size={12} color={Colors.silver} />
          </Pressable>
        )}
        {expanded ? (
          <Pressable
            onPress={toggleExpanded}
            hitSlop={8}
            className="flex-row items-center gap-1 rounded-full border border-gold bg-gold/15 px-3 py-1.5"
          >
            <Typography variant="caption" className="text-gold">
              Collapse
            </Typography>
            <Ionicons name="chevron-up" size={12} color={Colors.gold} />
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          {years.map((y) => (
            <Pressable
              key={y}
              onPress={() => setSelectedYear(y)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                y === selectedYear ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{y}</Typography>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {expanded && yearLoading ? (
        <ActivityIndicator color={Colors.gold} className="py-4" />
      ) : rows.length === 0 ? (
        <View>
          <EmptyState
            title={expanded ? 'No litters this year' : 'No active litters'}
            message={
              expanded ? `No litters recorded for ${selectedYear}.` : 'No active litters at the moment.'
            }
          />
          {expanded ? null : (
            <Button label="+ Add Litter" onPress={() => router.push('/(admin)/litters/new')} className="mt-3" />
          )}
        </View>
      ) : (
        rows.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => router.push(`/(admin)/litters/${l.id}` as never)}
            className="flex-row items-center border-b border-gold/10 py-3"
          >
            <View className="flex-1">
              <Typography variant="body">{formatKennelDate(l.actual_date)}</Typography>
              <Typography variant="caption" className="text-gold">
                {l.go_home_weeks ?? 10} wks: {formatKennelDate(l.go_home_date)}
              </Typography>
              <Typography variant="caption">
                {l.mother?.name ?? '—'} × {l.father?.name ?? '—'}
              </Typography>
              <Typography variant="caption">{formatPuppyAge(l.actual_date)}</Typography>
              {expanded && l.status ? (
                <Badge
                  label={titleCase(l.status)}
                  tone={LITTER_STATUS_TONE[l.status] ?? 'neutral'}
                  className="mt-1"
                />
              ) : null}
            </View>
            <Typography variant="label" className="mr-2">
              ♂{l.male_count ?? 0} ♀{l.female_count ?? 0}
            </Typography>
            <RowArrow />
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
