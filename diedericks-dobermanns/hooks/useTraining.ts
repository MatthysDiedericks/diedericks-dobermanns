import { useCallback, useEffect, useState } from 'react';

import {
  MOCK_AVAILABILITY,
  MOCK_DOGS,
  MOCK_SESSION_TYPES,
  MOCK_TRAINING_BOOKINGS,
} from '@/lib/mockData';
import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  Dog,
  TrainingAvailability,
  TrainingBooking,
  TrainingSessionType,
} from '@/types/app.types';

// Embedded select with disambiguated user foreign keys.
const SESSION_TYPE_SELECT =
  'id, name, description, duration_minutes, price, currency, session_format, is_active, sort_order, created_at, updated_at';
const AVAILABILITY_SELECT =
  'id, available_date, start_time, end_time, session_type_id, trainer_id, max_bookings, is_blocked, notes, created_at';
const BOOKING_SELECT =
  'id, client_id, dog_id, trainer_id, session_type_id, availability_id, scheduled_at, session_format, status, client_notes, trainer_notes, video_room_name, video_room_url, video_host_url, video_room_expires_at, confirmed_at, completed_at, cancelled_at, cancelled_by, created_at, ' +
  'session_type:training_session_types(id, name, description, duration_minutes, price, currency, session_format, is_active, sort_order), ' +
  'dog:dogs(id, name, colour, sex, status, date_of_birth), ' +
  'client:users!training_bookings_client_id_fkey(id, full_name, phone), ' +
  'trainer:users!training_bookings_trainer_id_fkey(id, full_name, phone), ' +
  'media:training_booking_media(id, booking_id, url, media_type, caption, uploaded_at)';

/** Single booking by ID — used for booking detail screen. */
export function useBookingById(id: string | undefined) {
  const [booking, setBooking] = useState<TrainingBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: qErr } = await supabase
        .from('training_bookings')
        .select(BOOKING_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (qErr) throw new Error(qErr.message);
      setBooking(data as TrainingBooking | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load booking');
      console.error('[useBookingById]', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { booking, loading, error, refresh };
}

/** Bookable session types. */
export function useSessionTypes(activeOnly = true): ListResult<TrainingSessionType> {
  const mock = activeOnly ? MOCK_SESSION_TYPES.filter((t) => t.is_active) : MOCK_SESSION_TYPES;
  return useRemoteList<TrainingSessionType>(mock, (c) => {
    const base = c.from('training_session_types').select(SESSION_TYPE_SELECT).order('sort_order');
    return activeOnly ? base.eq('is_active', true) : base;
  });
}

/** Upcoming, non-blocked availability slots (filter by type client-side). */
export function useAvailability(): ListResult<TrainingAvailability> {
  const today = new Date().toISOString().slice(0, 10);
  return useRemoteList<TrainingAvailability>(MOCK_AVAILABILITY, (c) =>
    c
      .from('training_availability')
      .select(AVAILABILITY_SELECT)
      .gte('available_date', today)
      .order('available_date')
      .order('start_time'),
  );
}

/** All availability rows (admin), including blocked. */
export function useAdminAvailability(): ListResult<TrainingAvailability> {
  return useRemoteList<TrainingAvailability>(MOCK_AVAILABILITY, (c) =>
    c.from('training_availability').select(AVAILABILITY_SELECT).order('available_date').order('start_time'),
  );
}

/** The signed-in client's bookings, newest first. */
export function useClientBookings(): ListResult<TrainingBooking> {
  const clientId = useAuthStore((s) => s.profile?.id);
  return useRemoteList<TrainingBooking>(MOCK_TRAINING_BOOKINGS, (c) =>
    c
      .from('training_bookings')
      .select(BOOKING_SELECT)
      .eq('client_id', clientId ?? '')
      .order('scheduled_at', { ascending: false }),
  );
}

/** All bookings for the admin dashboard. */
export function useAdminTrainingBookings(): ListResult<TrainingBooking> {
  return useRemoteList<TrainingBooking>(MOCK_TRAINING_BOOKINGS, (c) =>
    c.from('training_bookings').select(BOOKING_SELECT).order('scheduled_at', { ascending: false }),
  );
}

/** Dogs the client can attach to a session (reserved / purchased / in training). */
export function useMyDogs(): ListResult<Dog> {
  return useRemoteList<Dog>(MOCK_DOGS.slice(0, 3), (c) =>
    c
      .from('dogs')
      .select('id, name, colour, sex, status, date_of_birth, dog_media(url, is_primary)')
      .in('status', ['reserved', 'sold', 'in_training'])
      .order('name'),
  );
}
