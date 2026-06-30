import { useRouter } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { fetchBornLitters, fetchExpectedLittersTable } from '@/lib/phase10/queries';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { useCallback, useEffect, useState } from 'react';

type LitterRow = Record<string, unknown> & {
  id: string;
  name?: string | null;
  actual_date?: string | null;
  expected_date?: string | null;
  mother?: { name?: string } | null;
  father?: { name?: string } | null;
};

function daysUntil(date: string) {
  return differenceInDays(parseISO(date), new Date());
}

function dueTone(days: number) {
  if (days < 7) return 'text-danger';
  if (days <= 14) return 'text-amber-400';
  return 'text-success';
}

export function LitterWidgets() {
  const router = useRouter();
  const [born, setBorn] = useState<LitterRow[]>([]);
  const [expected, setExpected] = useState<LitterRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [b, e] = await Promise.all([fetchBornLitters(), fetchExpectedLittersTable()]);
      setBorn(b as LitterRow[]);
      setExpected(e as LitterRow[]);
    } catch {
      setBorn([]);
      setExpected([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <SurfaceCard title="Current Litters">
        {born.length === 0 ? (
          <EmptyState title="No born litters" message="Litters with status born will appear here." />
        ) : (
          born.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/(tabs)/dogs/litters/${l.id}` as never)}
              className="flex-row items-center border-b border-gold/10 py-3"
            >
              <View className="flex-1">
                <Typography variant="body">{l.name ?? 'Litter'}</Typography>
                <Typography variant="caption">
                  {l.mother?.name ?? '—'} × {l.father?.name ?? '—'}
                </Typography>
                <Typography variant="caption" className="text-subtle">
                  DOB {formatKennelDate(l.actual_date)}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.silver} />
            </Pressable>
          ))
        )}
      </SurfaceCard>

      <SurfaceCard title="Expected Litters">
        {expected.length === 0 ? (
          <Typography variant="caption" className="text-subtle">No expected litters scheduled.</Typography>
        ) : (
          expected.map((l) => {
            const d = l.expected_date;
            const days = d ? daysUntil(d) : null;
            return (
              <Pressable
                key={l.id}
                onPress={() => router.push(`/(tabs)/dogs/litters/${l.id}` as never)}
                className="flex-row items-center border-b border-gold/10 py-3"
              >
                <View className="flex-1">
                  <Typography variant="body">{l.mother?.name ?? 'Dam'} × {l.father?.name ?? 'Sire'}</Typography>
                  <Typography variant="caption">Due {formatKennelDate(l.expected_date)}</Typography>
                  {days != null ? (
                    <Typography variant="caption" className={dueTone(days)}>
                      {days} days until due
                    </Typography>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.silver} />
              </Pressable>
            );
          })
        )}
      </SurfaceCard>
    </>
  );
}
