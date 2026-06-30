"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

export async function saveTestimonial(
  input: TablesInsert<"testimonials"> & { id?: string },
) {
  await requireAdmin();
  const supabase = await createClient();
  if (input.id) {
    await supabase.from("testimonials").update(input).eq("id", input.id);
  } else {
    await supabase.from("testimonials").insert(input);
  }
  revalidatePath("/admin/testimonials");
}

export async function toggleTestimonial(
  id: string,
  field: "is_approved" | "is_featured",
  value: boolean,
) {
  await requireAdmin();
  const supabase = await createClient();
  const patch: TablesUpdate<"testimonials"> = { [field]: value };
  await supabase.from("testimonials").update(patch).eq("id", id);
  revalidatePath("/admin/testimonials");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/admin/testimonials");
}
