import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { BreedingProgrammeSection } from '@/components/dogs/detail/BreedingProgrammeSection';
import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { HeatStatusBadge } from '@/components/heats/HeatStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  useActiveHeat,
  useHeatCyclesForDog,
  useNextPredictedHeat,
} from '@/hooks/useHeatCycles';
import { requireSupabase } from '@/lib/supabase';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { daysUntil } from '@/lib/heats/calculations';
import { titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

interface LitterRow {
  id: string;
  name: string | null;
  status: string | null;
  expected_date: string | null;
  actual_date: string | null;
  puppy_count: number | null;
  available_count: number | null;
  litter_letter: string | null;
}

export function DogBreedingTab({ dog }: { dog: Dog }) {
  const router = useRouter();
  const { cycles, loading: heatsLoading } = useHeatCyclesForDog(dog.id);
  const { heat: activeHeat } = useActiveHeat(dog.id);
  const { predicted: nextPredicted } = useNextPredictedHeat(dog.id);
  const [litters, setLitters] = useState<LitterRow[]>([]);
  const [stats, setStats] = useState({ count: 0, puppies: 0, avg: 0 });

  const loadLitters = useCallback(async () => {
    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from('litters')
        .select(
          'id, name, status, expected_date, actual_date, puppy_count, available_count, litter_letter',
        )
        .or(`mother_id.eq.${dog.id},father_id.eq.${dog.id}`)
        .order('actual_date', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as LitterRow[];
      setLitters(rows);
      const count = rows.length;
      const puppies = rows.reduce((s, r) => s + (r.puppy_count ?? 0), 0);
      setStats({ count, puppies, avg: count ? Math.round((puppies / count) * 10) / 10 : 0 });
    } catch {
      setLitters([]);
    }
  }, [dog.id]);

  useEffect(() => {
    void loadLitters();
  }, [loadLitters]);

  return (
    <View className="pb-8">
      <BreedingProgrammeSection dogId={dog.id} />

      <SectionCard title="Breeding summary">
        <DetailRow label="Total litters" value={stats.count} />
        <DetailRow label="Total puppies" value={stats.puppies} />
        <DetailRow label="Average litter size" value={stats.avg || '—'} />
      </SectionCard>

      {dog.sex === 'female' ? (
        <>
          <SectionCard title="Heat status">
            {activeHeat ? (
              <View className="mb-2 flex-row items-center gap-2">
                <HeatStatusBadge status={activeHeat.status} />
                <Typography variant="caption">
                  Started {formatKennelDate(activeHeat.heat_start_date)}
                </Typography>
              </View>
            ) : (
              <Typography variant="caption" className="text-muted">
                No active heat
              </Typography>
            )}
            {nextPredicted ? (
              <DetailRow
                label="Next predicted"
                value={`${formatKennelDate(nextPredicted.heat_start_date)} (${daysUntil(nextPredicted.heat_start_date) ?? '—'} days)`}
              />
            ) : null}
            <Button
              label="View Full Heat History →"
              variant="outline"
              onPress={() => router.push(`/(admin)/heats/${dog.id}` as never)}
              fullWidth
              className="mt-3"
            />
          </SectionCard>

          <AccordionSection title="Recent heats" count={Math.min(cycles.length, 3)} defaultOpen>
          {heatsLoading ? (
            <Typography variant="caption">Loading…</Typography>
          ) : cycles.length === 0 ? (
            <EmptyTabState message="No heat cycles recorded." />
          ) : (
            <FlatList
              data={cycles.filter((c) => !c.is_predicted).slice(0, 3)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View className="mb-2 border-b border-gold/10 py-2">
                  <Typography variant="body">
                    {formatKennelDate(item.heat_start_date)} · {titleCase(item.status ?? '')}
                  </Typography>
                  {item.expected_whelp_date ? (
                    <Typography variant="caption">
                      Expected whelp {formatKennelDate(item.expected_whelp_date)}
                    </Typography>
                  ) : null}
                </View>
              )}
            />
          )}
          <Button
            label="Add Heat Cycle"
            variant="outline"
            onPress={() => router.push(`/(admin)/heats/${dog.id}` as never)}
            fullWidth
            className="mt-3"
          />
        </AccordionSection>
        </>
      ) : null}

      <AccordionSection title="Litters" count={litters.length} defaultOpen>
        {litters.length === 0 ? (
          <EmptyTabState message="No litters linked to this dog." />
        ) : (
          <FlatList
            data={litters}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/(admin)/litters/${item.id}` as never)}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-gold/15 bg-black-rich p-3"
              >
                <View>
                  <Typography variant="body">
                    {item.litter_letter ? `Litter ${item.litter_letter}` : item.name ?? 'Litter'}
                  </Typography>
                  <Typography variant="caption">
                    {formatKennelDate(item.actual_date ?? item.expected_date)} ·{' '}
                    {item.puppy_count ?? 0} puppies
                  </Typography>
                </View>
                {item.status ? <Badge label={titleCase(item.status)} tone="gold" /> : null}
              </Pressable>
            )}
          />
        )}
      </AccordionSection>
    </View>
  );
}
