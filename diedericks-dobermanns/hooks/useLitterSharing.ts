import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

export const SHARING_SECTIONS = [
  { key: 'physical_attributes', label: 'Physical attributes' },
  { key: 'genetic_tests', label: 'Genetic tests' },
  { key: 'health_tests', label: 'Health tests' },
  { key: 'vet_visits', label: 'Vet visits' },
  { key: 'vaccinations', label: 'Vaccinations' },
  { key: 'dewormings', label: 'Dewormings' },
  { key: 'breeding_info', label: 'Breeding info' },
  { key: 'gallery', label: 'Gallery' },
] as const;

export interface PuppySharingRow {
  dog_id: string;
  is_public_page: boolean;
  is_pedigree_public: boolean;
}

export function useLitterSharing(litterId: string, puppyIds: string[]) {
  const [publicSections, setPublicSections] = useState<string[]>([]);
  const [puppySharing, setPuppySharing] = useState<Map<string, PuppySharingRow>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const { data: litter } = await client
      .from('litters')
      .select('public_sections')
      .eq('id', litterId)
      .single();
    setPublicSections((litter?.public_sections as string[]) ?? []);

    if (puppyIds.length) {
      const { data: sharing } = await client
        .from('puppy_sharing')
        .select('dog_id, is_public_page, is_pedigree_public')
        .in('dog_id', puppyIds);
      const map = new Map<string, PuppySharingRow>();
      for (const id of puppyIds) {
        const row = (sharing ?? []).find((s) => s.dog_id === id);
        map.set(id, {
          dog_id: id,
          is_public_page: row?.is_public_page ?? false,
          is_pedigree_public: row?.is_pedigree_public ?? false,
        });
      }
      setPuppySharing(map);
    }
    setLoading(false);
  }, [litterId, puppyIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatePublicSections = useCallback(
    async (sections: string[]) => {
      const { error } = await requireSupabase()
        .from('litters')
        .update({ public_sections: sections })
        .eq('id', litterId);
      if (error) throw new Error(error.message);
      setPublicSections(sections);
    },
    [litterId],
  );

  const upsertPuppySharing = useCallback(
    async (dogId: string, patch: Partial<Pick<PuppySharingRow, 'is_public_page' | 'is_pedigree_public'>>) => {
      const current = puppySharing.get(dogId) ?? {
        dog_id: dogId,
        is_public_page: false,
        is_pedigree_public: false,
      };
      const next = { ...current, ...patch };
      const { error } = await requireSupabase().from('puppy_sharing').upsert(
        {
          dog_id: dogId,
          is_public_page: next.is_public_page,
          is_pedigree_public: next.is_pedigree_public,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dog_id' },
      );
      if (error) throw new Error(error.message);
      setPuppySharing((m) => new Map(m).set(dogId, next));
    },
    [puppySharing],
  );

  return {
    publicSections,
    puppySharing,
    loading,
    refresh,
    updatePublicSections,
    upsertPuppySharing,
  };
}
