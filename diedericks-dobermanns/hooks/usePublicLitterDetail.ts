import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PuppyWeightLog } from '@/hooks/useLitterWeights';
import { deriveMilestones, type Milestone } from '@/lib/litters/milestones';
import type { WeighingSession } from '@/lib/litters/weighingSchedule';
import {
  fetchPublicLitter,
  fetchPublicLitterMedia,
  fetchPublicLitterPuppies,
  fetchPublicPuppyWeights,
  type PublicLitterMediaRow,
  type PublicLitterRow,
  type PublicPuppyRow,
  type PublicWeightLogRow,
} from '@/lib/litters/publicLitterQueries';
import { supabase } from '@/lib/supabase';
import type { DogMedia } from '@/types/app.types';

/**
 * Read-only data for the public litter page: the litter itself, its public
 * puppies, their weight history, a gallery mapped into `DogMedia` shape (so
 * the existing `PublicPhotoGallery` can be reused unmodified), and a derived
 * milestones strip. All fetches go through `lib/litters/publicLitterQueries`,
 * which uses explicit column allow-lists — never `select('*')`.
 */
export function usePublicLitterDetail(id: string | undefined) {
  const [litter, setLitter] = useState<PublicLitterRow | null>(null);
  const [puppies, setPuppies] = useState<PublicPuppyRow[]>([]);
  const [media, setMedia] = useState<PublicLitterMediaRow[]>([]);
  const [weights, setWeights] = useState<PublicWeightLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setLitter(null);
      setLoading(false);
      return;
    }
    try {
      const litterRow = await fetchPublicLitter(id);
      setLitter(litterRow);
      if (!litterRow) {
        setPuppies([]);
        setMedia([]);
        setWeights([]);
        return;
      }
      const [puppyRows, mediaRows] = await Promise.all([
        fetchPublicLitterPuppies(id),
        fetchPublicLitterMedia(id),
      ]);
      setPuppies(puppyRows);
      setMedia(mediaRows);
      setWeights(await fetchPublicPuppyWeights(puppyRows.map((p) => p.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litter');
      setLitter(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const weightsByPuppyId = useMemo(() => {
    const map = new Map<string, PuppyWeightLog[]>();
    for (const p of puppies) map.set(p.id, []);
    for (const w of weights) {
      const arr = map.get(w.dog_id) ?? [];
      arr.push({ ...w, session: w.session as WeighingSession | null, notes: null });
      map.set(w.dog_id, arr);
    }
    return map;
  }, [puppies, weights]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    weights.forEach((w) => dates.add(w.recorded_date));
    return [...dates].sort();
  }, [weights]);

  const galleryMedia: DogMedia[] = useMemo(
    () =>
      media.map((m, i) => ({
        id: m.id,
        dog_id: m.dog_id ?? '',
        type: m.media_type,
        url: m.public_url,
        thumbnail_url: m.public_url,
        caption: m.caption,
        is_primary: i === 0,
        sort_order: m.sort_order,
        uploaded_at: m.created_at ?? '',
      })),
    [media],
  );

  const milestones: Milestone[] = useMemo(
    () => deriveMilestones(litter?.actual_date, litter?.go_home_date, litter?.go_home_weeks),
    [litter],
  );

  return {
    litter,
    puppies,
    weightsByPuppyId,
    uniqueDates,
    galleryMedia,
    milestones,
    loading,
    error,
    refresh,
  };
}
