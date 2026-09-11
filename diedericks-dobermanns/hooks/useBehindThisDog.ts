import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  behindThisDogSummaryLine,
  summarizeBehindThisDog,
  type BloodlineAncestorInput,
  type BehindThisDogBlock,
} from '@/lib/pedigree/behindThisDog';
import { supabase } from '@/lib/supabase';

const ANCESTOR_SELECT =
  'dog_id, position, generation, registered_name, titles_health';

type AncestorQueryRow = {
  dog_id: string;
  position: string;
  generation: number;
  registered_name: string | null;
  titles_health: string | null;
};

function toInput(row: AncestorQueryRow): BloodlineAncestorInput {
  return {
    position: row.position,
    generation: row.generation,
    registered_name: row.registered_name,
    titles_health: row.titles_health,
  };
}

function groupByDog(rows: AncestorQueryRow[]): Map<string, BloodlineAncestorInput[]> {
  const grouped = new Map<string, BloodlineAncestorInput[]>();
  for (const row of rows) {
    const list = grouped.get(row.dog_id) ?? [];
    list.push(toInput(row));
    grouped.set(row.dog_id, list);
  }
  return grouped;
}

export async function fetchAncestorsForDogs(
  dogIds: string[],
): Promise<Map<string, BloodlineAncestorInput[]>> {
  if (dogIds.length === 0 || !supabase) return new Map();
  const { data, error } = await supabase
    .from('pedigree_ancestors')
    .select(ANCESTOR_SELECT)
    .in('dog_id', dogIds);
  if (error) {
    console.error('[fetchAncestorsForDogs]', error);
    return new Map();
  }
  return groupByDog((data ?? []) as AncestorQueryRow[]);
}

export function useBehindSummaries(dogIds: string[]) {
  const key = dogIds.slice().sort().join(',');
  const [summaries, setSummaries] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    const ids = key ? key.split(',') : [];
    const grouped = await fetchAncestorsForDogs(ids);
    const next = new Map<string, string>();
    for (const [id, ancestors] of grouped) {
      const line = behindThisDogSummaryLine(ancestors);
      if (line) next.set(id, line);
    }
    setSummaries(next);
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return summaries;
}

export function usePairingBehindBlock(sireId: string | null | undefined, damId: string | null | undefined) {
  const ids = useMemo(
    () => [sireId, damId].filter((id): id is string => Boolean(id)),
    [sireId, damId],
  );
  const [block, setBlock] = useState<BehindThisDogBlock | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const grouped = await fetchAncestorsForDogs(ids);
      if (cancelled) return;
      const combined: BloodlineAncestorInput[] = [];
      for (const ancestors of grouped.values()) combined.push(...ancestors);
      setBlock(summarizeBehindThisDog(combined));
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return block;
}
