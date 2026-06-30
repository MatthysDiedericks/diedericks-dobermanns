import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  TrainingManager,
  type AvailabilityRow,
  type BookingRow,
} from "@/components/admin/TrainingManager";
import { createClient } from "@/lib/supabase/server";
import type { TrainingSessionType } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminTrainingPage() {
  const supabase = await createClient();

  const [bookings, sessionTypes, availability, trainers] = await Promise.all([
    supabase
      .from("training_bookings")
      .select(
        "id, scheduled_at, duration_minutes, session_format, status, client_notes, trainer_notes, trainer_id, video_room_url, client:users!training_bookings_client_id_fkey(full_name), session_type:training_session_types(name), trainer:users!training_bookings_trainer_id_fkey(full_name)",
      )
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("training_session_types")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("training_availability")
      .select(
        "id, available_date, start_time, end_time, max_bookings, session_type:training_session_types(name)",
      )
      .order("available_date", { ascending: true }),
    supabase
      .from("users")
      .select("id, full_name")
      .in("role", ["admin", "super_admin", "trainer"]),
  ]);

  return (
    <>
      <AdminHeader
        title="Training Bookings"
        subtitle="Requests, scheduling, session types, and availability."
      />
      <TrainingManager
        bookings={(bookings.data ?? []) as unknown as BookingRow[]}
        sessionTypes={(sessionTypes.data ?? []) as TrainingSessionType[]}
        availability={(availability.data ?? []) as unknown as AvailabilityRow[]}
        trainers={trainers.data ?? []}
      />
    </>
  );
}
