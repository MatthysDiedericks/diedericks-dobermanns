import { SOCIAL_SETTING_KEYS } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import type {
  AppSettings,
  ApplicationStatus,
  SessionFormat,
} from '@/types/app.types';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

import { ok, simulate, type MutationResult, type SaveResult } from '@/lib/shared/mutationTypes';

export async function saveAppSettings(values: Partial<AppSettings>): Promise<MutationResult> {
  if (!supabase) return simulate();
  const rows = (Object.keys(SOCIAL_SETTING_KEYS) as (keyof AppSettings)[])
    .filter((field) => values[field] !== undefined)
    .map((field) => ({ key: SOCIAL_SETTING_KEYS[field], value: values[field] ?? null }));
  if (rows.length === 0) return ok;
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

export interface BookingInput {
  session_type_id: string;
  availability_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_format: SessionFormat;
  dog_id: string | null;
  client_notes: string | null;
}

export async function createBooking(input: BookingInput, clientId: string): Promise<SaveResult> {
  if (!supabase) {
    await simulate();
    return { error: null, id: 'tb-demo' };
  }
  const { data, error } = await supabase
    .from('training_bookings')
    .insert({
      client_id: clientId,
      session_type_id: input.session_type_id,
      availability_id: input.availability_id,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes,
      session_format: input.session_format,
      dog_id: input.dog_id,
      client_notes: input.client_notes,
      status: 'pending',
    })
    .select('id')
    .single();
  return { error: error?.message ?? null, id: data?.id ?? null };
}

export async function cancelBooking(
  id: string,
  cancelledBy: string,
  reason?: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_bookings')
    .update({
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function confirmBooking(
  id: string,
  videoRoomUrl?: string | null,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const patch: TablesUpdate<'training_bookings'> = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  };
  if (videoRoomUrl) patch.video_room_url = videoRoomUrl;
  const { error } = await supabase.from('training_bookings').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function completeBooking(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_bookings')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function assignTrainer(id: string, trainerId: string | null): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_bookings')
    .update({ trainer_id: trainerId })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setBookingVideoUrl(id: string, url: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_bookings')
    .update({ video_room_url: url, status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function saveTrainerNotes(id: string, notes: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_bookings')
    .update({ trainer_notes: notes })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function toggleSessionTypeActive(
  id: string,
  isActive: boolean,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('training_session_types')
    .update({ is_active: isActive })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export interface AvailabilityInput {
  available_date: string;
  start_time: string;
  end_time: string;
  session_type_id: string | null;
  max_bookings: number;
  notes: string | null;
}

export async function createAvailability(input: AvailabilityInput): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('training_availability').insert({
    available_date: input.available_date,
    start_time: input.start_time,
    end_time: input.end_time,
    session_type_id: input.session_type_id,
    max_bookings: input.max_bookings,
    notes: input.notes,
  });
  return { error: error?.message ?? null };
}

export async function deleteAvailability(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('training_availability').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function reviewApplication(
  id: string,
  status: ApplicationStatus,
  adminNotes: string | null,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('applications')
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function updateEnquiryStatus(
  id: string,
  status: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('enquiries')
    .update({ status, replied_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function signContract(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('contracts')
    .update({ signed_by_client: true, signed_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setTestimonialApproved(
  id: string,
  isApproved: boolean,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('testimonials')
    .update({ is_approved: isApproved })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setFaqPublished(
  id: string,
  isPublished: boolean,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('faq')
    .update({ is_published: isPublished })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setGalleryFeatured(
  id: string,
  isFeatured: boolean,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('gallery_items')
    .update({ is_featured: isFeatured })
    .eq('id', id);
  return { error: error?.message ?? null };
}
