import {
  MOCK_ACHIEVEMENTS,
  MOCK_TIMELINE,
  MOCK_TRAINING_LOGS,
  MOCK_VACCINATIONS,
} from '@/lib/mockData';
import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import type {
  Achievement,
  TimelineEntry,
  TrainingLog,
  Vaccination,
} from '@/types/app.types';

/** Achievements for a single dog, or all achievements when no id is given. */
export function useAchievements(dogId?: string): ListResult<Achievement> {
  const mock = dogId
    ? MOCK_ACHIEVEMENTS.filter((a) => a.dog_id === dogId)
    : MOCK_ACHIEVEMENTS;
  return useRemoteList<Achievement>(mock, (client) => {
    const base = client
      .from('achievements')
      .select('*')
      .order('trial_date', { ascending: false });
    return dogId ? base.eq('dog_id', dogId) : base;
  });
}

export function useVaccinations(dogId: string): ListResult<Vaccination> {
  const mock = MOCK_VACCINATIONS.filter((v) => v.dog_id === dogId);
  return useRemoteList<Vaccination>(mock, (client) =>
    client
      .from('vaccinations')
      .select('*')
      .eq('dog_id', dogId)
      .order('date_administered', { ascending: false }),
  );
}

export function useTrainingLogs(dogId: string): ListResult<TrainingLog> {
  const mock = MOCK_TRAINING_LOGS.filter((t) => t.dog_id === dogId);
  return useRemoteList<TrainingLog>(mock, (client) =>
    client
      .from('training_logs')
      .select('*')
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
      .select('*')
      .eq('dog_id', dogId)
      .order('entry_date', { ascending: false }),
  );
}
