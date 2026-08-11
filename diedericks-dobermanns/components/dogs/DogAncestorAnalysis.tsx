import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  fetchPedigreeMap,
  resolveAncestors,
} from '@/lib/breeding/ancestors';
import { requireSupabase } from '@/lib/supabase';

const DEPTHS = [3, 4, 5, 6, 7, 8] as const;

type AncestorStat = {
  id: string;
  name: string;
  appearances: number;
  contribution: number;
  wrightsCoi: number | null;
};

function aggregateAncestorStats(
  paths: { ancestor_id: string; depth: number }[],
  nameById: Map<string, string>,
  coiById: Map<string, number | null>,
  maxDepth: number,
): AncestorStat[] {
  const stats = new Map<string, { appearances: number; contribution: number }>();
  for (const p of paths) {
    if (p.depth > maxDepth) continue;
    const cur = stats.get(p.ancestor_id) ?? { appearances: 0, contribution: 0 };
    cur.appearances += 1;
    cur.contribution += 1 / 2 ** p.depth;
    stats.set(p.ancestor_id, cur);
  }
  return [...stats.entries()]
    .map(([id, s]) => ({
      id,
      name: nameById.get(id) ?? 'Unknown',
      appearances: s.appearances,
      contribution: Math.round(s.contribution * 10000) / 10000,
      wrightsCoi: coiById.get(id) ?? null,
    }))
    .sort((a, b) => b.contribution - a.contribution || a.name.localeCompare(b.name));
}

interface DogAncestorAnalysisProps {
  dogId: string;
  storedCoi?: number | null;
}

export function DogAncestorAnalysis({ dogId, storedCoi }: DogAncestorAnalysisProps) {
  const [depth, setDepth] = useState(5);
  const [stats, setStats] = useState<AncestorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const pedigree = await fetchPedigreeMap();
        const paths = await resolveAncestors(dogId, pedigree, depth);
        const ids = [...new Set(paths.map((p) => p.ancestor_id))];
        const nameById = new Map<string, string>();
        const coiById = new Map<string, number | null>();
        if (ids.length) {
          const { data } = await requireSupabase()
            .from('dogs')
            .select('id, name, wrights_coi')
            .in('id', ids);
          for (const row of data ?? []) {
            nameById.set(String(row.id), String(row.name ?? 'Unknown'));
            coiById.set(
              String(row.id),
              row.wrights_coi != null ? Number(row.wrights_coi) : null,
            );
          }
        }
        if (!cancelled) {
          setStats(aggregateAncestorStats(paths, nameById, coiById, depth));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to analyse ancestors');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dogId, depth]);

  return (
    <View>
      {storedCoi != null ? (
        <Typography variant="body" className="mb-3">
          DogBreederPro / stored COI: {storedCoi.toFixed(2)}%
        </Typography>
      ) : (
        <Typography variant="caption" className="mb-3 text-muted">
          No DogBreederPro / stored COI on file.
        </Typography>
      )}

      <Typography variant="label" className="mb-2 text-silver">
        Depth
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {DEPTHS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDepth(d)}
            className={`rounded-full border px-3 py-1.5 ${
              depth === d ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">{d}</Typography>
          </Pressable>
        ))}
      </View>

      <Typography variant="caption" className="mb-4 text-muted">
        Contributions calculated from {depth} generations held in this system
      </Typography>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : null}
      {error ? (
        <Typography variant="body" className="text-danger">
          {error}
        </Typography>
      ) : null}
      {!loading && !error && !stats.length ? (
        <Typography variant="bodyMuted">
          No linked ancestors found for analysis.
        </Typography>
      ) : null}
      {!loading &&
        stats.map((s) => (
          <View
            key={s.id}
            className="mb-2 rounded-xl border border-gold/15 bg-black-rich px-3 py-2"
          >
            <Typography variant="body">{s.name}</Typography>
            <Typography variant="caption" className="text-muted">
              Appears {s.appearances}× · contribution{' '}
              {(s.contribution * 100).toFixed(2)}%
              {s.wrightsCoi != null
                ? ` · DogBreederPro / stored COI ${s.wrightsCoi.toFixed(2)}%`
                : ''}
            </Typography>
          </View>
        ))}
    </View>
  );
}
