"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type LitterInput = {
  id?: string;
  name?: string | null;
  mother_id?: string | null;
  father_id?: string | null;
  expected_date?: string | null;
  actual_date?: string | null;
  status: string;
  puppy_count?: number | null;
  available_count?: number | null;
  description?: string | null;
  is_public: boolean;
};

export async function upsertLitter(
  input: LitterInput,
): Promise<{ id?: string; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    name: input.name || null,
    mother_id: input.mother_id || null,
    father_id: input.father_id || null,
    expected_date: input.expected_date || null,
    actual_date: input.actual_date || null,
    status: input.status,
    puppy_count: input.puppy_count ?? null,
    available_count: input.available_count ?? null,
    description: input.description || null,
    is_public: input.is_public,
  };

  if (input.id) {
    const { error } = await supabase
      .from("litters")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/admin/litters");
    revalidatePath(`/admin/litters/${input.id}`);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("litters")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/litters");
  return { id: data.id };
}

export async function deleteLitter(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("litters").delete().eq("id", id);
  revalidatePath("/admin/litters");
}

export async function setWaitlistStatus(
  id: string,
  litterId: string,
  status: string,
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("waiting_list").update({ status }).eq("id", id);
  revalidatePath(`/admin/litters/${litterId}`);
}
