import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_DOGS, MOCK_TRAINING_BOOKINGS } from '@/lib/mockData';
import { requireSupabase } from '@/lib/supabase';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
import type { Dog, DogMedia, TrainingBooking } from '@/types/app.types';

const TRAINER_BOOKING_SELECT =
  'id, client_id, dog_id, trainer_id, scheduled_at, duration_minutes, session_format, status, ' +
  'client_notes, trainer_notes, confirmed_at, completed_at, updated_at, ' +
  'video_room_url, video_host_url, ' +
  'session_type:training_session_types(id, name, duration_minutes), ' +
  'dog:dogs(id, name, colour, dog_media(url, is_primary, thumbnail_url)), ' +
  'client:users!training_bookings_client_id_fkey(id, full_name, email)';

export interface TrainerDogSummary {
  dog: Dog;
  completedSessions: number;
  lastSessionDate: string | null;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function isToday(iso: string): boolean {
  const t = new Date(iso).getTime();
  return t >= startOfToday().getTime() && t < endOfToday().getTime();
}

function isUpcoming(iso: string): boolean {
  return new Date(iso).getTime() >= endOfToday().getTime();
}

function activeStatuses(status: string): boolean {
  return status !== 'cancelled';
}

function mapBooking(row: unknown): TrainingBooking {
  const r = row as TrainingBooking & { dog?: Dog & { dog_media?: Dog['media'] } };
  if (r.dog?.dog_media) {
    return { ...r, dog: { ...r.dog, media: r.dog.dog_media } };
  }
  return r;
}

export function useTrainerBookings() {
  const trainerId = useAuthStore((s) => s.profile?.id);
  const [bookings, setBookings] = useState<TrainingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!trainerId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        const mock = MOCK_TRAINING_BOOKINGS.filter(
          (b) => b.trainer_id === trainerId || b.trainer_id == null,
        );
        setBookings(mock);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('training_bookings')
        .select(TRAINER_BOOKING_SELECT)
        .eq('trainer_id', trainerId)
        .order('scheduled_at', { ascending: true });
      if (err) throw new Error(err.message);
      setBookings((data ?? []).map(mapBooking));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = useMemo(
    () =>
      bookings.filter(
        (b) => isToday(b.scheduled_at) && activeStatuses(b.status),
      ),
    [bookings],
  );

  const upcoming = useMemo(
    () =>
      bookings.filter(
        (b) => isUpcoming(b.scheduled_at) && activeStatuses(b.status),
      ),
    [bookings],
  );

  return { bookings, today, upcoming, loading, error, refresh };
}

export function useTrainerBooking(id: string | undefined) {
  const trainerId = useAuthStore((s) => s.profile?.id);
  const [booking, setBooking] = useState<TrainingBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id || !trainerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        const found =
          MOCK_TRAINING_BOOKINGS.find((b) => b.id === id) ??
          MOCK_TRAINING_BOOKINGS[0] ??
          null;
        setBooking(found);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('training_bookings')
        .select(TRAINER_BOOKING_SELECT)
        .eq('id', id)
        .eq('trainer_id', trainerId)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setBooking(data ? mapBooking(data) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load session');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id, trainerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { booking, loading, error, refresh };
}

export function useTrainerDogs() {
  const trainerId = useAuthStore((s) => s.profile?.id);
  const [dogs, setDogs] = useState<TrainerDogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!trainerId) {
      setDogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        const map = new Map<string, TrainerDogSummary>();
        for (const b of MOCK_TRAINING_BOOKINGS) {
          const dog = b.dog ?? MOCK_DOGS.find((d) => d.id === b.dog_id);
          if (!dog) continue;
          const existing = map.get(dog.id);
          const completed = b.status === 'completed' ? 1 : 0;
          if (!existing) {
            map.set(dog.id, {
              dog,
              completedSessions: completed,
              lastSessionDate: b.scheduled_at,
            });
          } else {
            existing.completedSessions += completed;
            if (b.scheduled_at > (existing.lastSessionDate ?? '')) {
              existing.lastSessionDate = b.scheduled_at;
            }
          }
        }
        setDogs([...map.values()]);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('training_bookings')
        .select(
          'dog_id, scheduled_at, status, dog:dogs(id, name, colour, status, dog_media(url, is_primary, thumbnail_url))',
        )
        .eq('trainer_id', trainerId)
        .not('dog_id', 'is', null);
      if (err) throw new Error(err.message);

      const map = new Map<string, TrainerDogSummary>();
      for (const row of data ?? []) {
        const r = row as {
          dog_id: string;
          scheduled_at: string;
          status: string;
          dog: Dog & { dog_media?: Dog['media'] };
        };
        if (!r.dog || r.dog.status !== 'in_training') continue;
        const media = r.dog.dog_media ?? [];
        const dog: Dog = { ...r.dog, media };
        const existing = map.get(r.dog_id);
        const completed = r.status === 'completed' ? 1 : 0;
        if (!existing) {
          map.set(r.dog_id, {
            dog,
            completedSessions: completed,
            lastSessionDate: r.scheduled_at,
          });
        } else {
          existing.completedSessions += completed;
          if (
            !existing.lastSessionDate ||
            r.scheduled_at > existing.lastSessionDate
          ) {
            existing.lastSessionDate = r.scheduled_at;
          }
        }
      }
      setDogs([...map.values()].sort((a, b) => a.dog.name.localeCompare(b.dog.name)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dogs');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dogs, loading, error, refresh };
}

export function useTrainerDogHistory(dogId: string) {
  const trainerId = useAuthStore((s) => s.profile?.id);
  const [sessions, setSessions] = useState<TrainingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId || !trainerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        setSessions(
          MOCK_TRAINING_BOOKINGS.filter((b) => b.dog_id === dogId || b.dog?.id === dogId),
        );
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('training_bookings')
        .select(TRAINER_BOOKING_SELECT)
        .eq('trainer_id', trainerId)
        .eq('dog_id', dogId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });
      if (err) throw new Error(err.message);
      setSessions((data ?? []).map(mapBooking));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [dogId, trainerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}

export function useTrainerStats() {
  const trainerId = useAuthStore((s) => s.profile?.id);
  const [weekCount, setWeekCount] = useState(0);
  const [lifetimeCompleted, setLifetimeCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!trainerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (Config.isDemoMode) {
        setWeekCount(2);
        setLifetimeCompleted(12);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { count: week, error: wErr } = await supabase
        .from('training_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .gte('scheduled_at', weekStart.toISOString())
        .lt('scheduled_at', weekEnd.toISOString())
        .neq('status', 'cancelled');

      const { count: lifetime, error: lErr } = await supabase
        .from('training_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'completed');

      if (wErr) throw new Error(wErr.message);
      if (lErr) throw new Error(lErr.message);
      setWeekCount(week ?? 0);
      setLifetimeCompleted(lifetime ?? 0);
    } catch {
      setWeekCount(0);
      setLifetimeCompleted(0);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weekCount, lifetimeCompleted, loading, refresh };
}

const SESSION_MEDIA_SELECT =
  'id, dog_id, url, thumbnail_url, type, is_primary, sort_order, caption, uploaded_at';

export function sessionMediaCaption(bookingId: string): string {
  return `session-${bookingId}`;
}

export function useSessionDogMedia(dogId: string, bookingId: string) {
  const [media, setMedia] = useState<DogMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const caption = sessionMediaCaption(bookingId);

  const refresh = useCallback(async () => {
    if (!dogId || !bookingId) return;
    setLoading(true);
    try {
      if (Config.isDemoMode) {
        setMedia([]);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('dog_media')
        .select(SESSION_MEDIA_SELECT)
        .eq('dog_id', dogId)
        .eq('caption', caption)
        .order('uploaded_at', { ascending: false });
      if (err) throw new Error(err.message);
      setMedia((data ?? []) as DogMedia[]);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId, caption, dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { media, loading, refresh, caption };
}
