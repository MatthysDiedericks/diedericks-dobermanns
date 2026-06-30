"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

const path = "/admin/training";

export async function setBookingStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  reason?: string,
) {
  await requireAdmin();
  const supabase = await createClient();
  const patch: TablesUpdate<"training_bookings"> = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
    if (reason) patch.cancellation_reason = reason;
  }
  await supabase.from("training_bookings").update(patch).eq("id", id);
  revalidatePath(path);
}

export async function assignTrainer(id: string, trainerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("training_bookings")
    .update({ trainer_id: trainerId || null })
    .eq("id", id);
  revalidatePath(path);
}

export async function saveSessionType(
  input: TablesInsert<"training_session_types"> & { id?: string },
) {
  await requireAdmin();
  const supabase = await createClient();
  if (input.id) {
    await supabase
      .from("training_session_types")
      .update(input)
      .eq("id", input.id);
  } else {
    await supabase.from("training_session_types").insert(input);
  }
  revalidatePath(path);
}

export async function toggleSessionType(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("training_session_types")
    .update({ is_active: value })
    .eq("id", id);
  revalidatePath(path);
}

export async function createAvailability(
  input: TablesInsert<"training_availability">,
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("training_availability").insert(input);
  revalidatePath(path);
}

export async function deleteAvailability(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("training_availability").delete().eq("id", id);
  revalidatePath(path);
}
