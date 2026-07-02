import {
  MOCK_ACHIEVEMENTS,
  MOCK_TIMELINE,
  MOCK_TRAINING_LOGS,
  MOCK_VACCINATIONS,
} from '@/lib/mockData';
import { useCallback, useEffect, useState } from 'react';

import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import { requireSupabase } from '@/lib/supabase';
import type {
  Achievement,
  TimelineEntry,
  TrainingLog,
  Vaccination,
  WeightLog,
} from '@/types/app.types';

const ACHIEVEMENT_SELECT =
  'id, dog_id, title, trial_date, location, judge, score, notes, created_at';
const VACCINATION_RECORD_SELECT =
  'id, dog_id, vaccine_name, date_administered, next_due_date, administered_by, batch_number, notes, created_at';
const TRAINING_LOG_SELECT =
  'id, dog_id, trainer_id, training_type, session_date, duration_minutes, milestone, progress_level, notes, video_url, created_at';
const TIMELINE_SELECT =
  'id, dog_id, author_id, source, category, entry_date, title, notes, photo_urls, video_url, created_at';

/** Achievements for a single dog, or all achievements when no id is given. */
export function useAchievements(dogId?: string): ListResult<Achievement> {
  const mock = dogId
    ? MOCK_ACHIEVEMENTS.filter((a) => a.dog_id === dogId)
    : MOCK_ACHIEVEMENTS;
  return useRemoteList<Achievement>(mock, (client) => {
    const base = client
      .from('achievements')
      .select(ACHIEVEMENT_SELECT)
      .order('trial_date', { ascending: false });
    return dogId ? base.eq('dog_id', dogId) : base;
  });
}

export function useVaccinations(dogId: string): ListResult<Vaccination> {
  const mock = MOCK_VACCINATIONS.filter((v) => v.dog_id === dogId);
  return useRemoteList<Vaccination>(mock, (client) =>
    client
      .from('vaccinations')
      .select(VACCINATION_RECORD_SELECT)
      .eq('dog_id', dogId)
      .order('date_administered', { ascending: false }),
  );
}

export function useTrainingLogs(dogId: string): ListResult<TrainingLog> {
  const mock = MOCK_TRAINING_LOGS.filter((t) => t.dog_id === dogId);
  return useRemoteList<TrainingLog>(mock, (client) =>
    client
      .from('training_logs')
      .select(TRAINING_LOG_SELECT)
      .eq('dog_id', dogId)
      .order('session_date', { ascending: false }),
  );
}

/** The chronological story / timeline for a single dog (newest first). */
export function useDogTimeline(dogId: string): ListResult<TimelineEntry> {
  const mock = MOCK_TIMELINE.filter((t) => t.dog_id === dogId).sort((a, b) =>
    b.entry_date.localeCompare(a.entry_date),
  );
  return useRemoteList<TimelineEntry>(mock, (client) =>
    client
      .from('dog_timeline')
      .select(TIMELINE_SELECT)
      .eq('dog_id', dogId)
      .order('entry_date', { ascending: false }),
  );
}

const WEIGHT_LOG_SELECT = 'id, dog_id, weight_kg, recorded_date, notes';

export function useDogWeightLogs(dogId: string) {
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setWeights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('weight_logs')
        .select(WEIGHT_LOG_SELECT)
        .eq('dog_id', dogId)
        .order('recorded_date', { ascending: true });
      if (err) throw new Error(err.message);
      setWeights((data ?? []) as WeightLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weight history');
      setWeights([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { weights, loading, error, refresh };
}
