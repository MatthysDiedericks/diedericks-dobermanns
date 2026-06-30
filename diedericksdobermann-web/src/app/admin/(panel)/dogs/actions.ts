"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

export type DogInput = {
  id?: string;
  name: string;
  breed?: string;
  sex?: string | null;
  colour?: string | null;
  date_of_birth?: string | null;
  category: string;
  status: string;
  bloodline?: string | null;
  microchip_number?: string | null;
  price?: number | null;
  description?: string | null;
  training_notes?: string | null;
  temperament_notes?: string | null;
  dcm_status?: string | null;
  hip_score?: string | null;
  elbow_score?: string | null;
  pedigree_url?: string | null;
  mother_id?: string | null;
  father_id?: string | null;
  is_public: boolean;
  is_featured: boolean;
};

export async function upsertDog(
  input: DogInput,
): Promise<{ id?: string; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    name: input.name,
    breed: input.breed || "Dobermann",
    sex: input.sex || null,
    colour: input.colour || null,
    date_of_birth: input.date_of_birth || null,
    category: input.category,
    status: input.status,
    bloodline: input.bloodline || null,
    microchip_number: input.microchip_number || null,
    price: input.price ?? null,
    description: input.description || null,
    training_notes: input.training_notes || null,
    temperament_notes: input.temperament_notes || null,
    dcm_status: input.dcm_status || null,
    hip_score: input.hip_score || null,
    elbow_score: input.elbow_score || null,
    pedigree_url: input.pedigree_url || null,
    mother_id: input.mother_id || null,
    father_id: input.father_id || null,
    is_public: input.is_public,
    is_featured: input.is_featured,
  };

  if (input.id) {
    const { error } = await supabase
      .from("dogs")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/admin/dogs");
    revalidatePath(`/admin/dogs/${input.id}`);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("dogs")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/dogs");
  return { id: data.id };
}

export async function toggleDogFlag(
  id: string,
  field: "is_public" | "is_featured",
  value: boolean,
) {
  await requireAdmin();
  const supabase = await createClient();
  const patch: TablesUpdate<"dogs"> = { [field]: value };
  await supabase.from("dogs").update(patch).eq("id", id);
  revalidatePath("/admin/dogs");
}

export async function deleteDog(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("dogs").delete().eq("id", id);
  revalidatePath("/admin/dogs");
}

export async function addDogMedia(
  media: TablesInsert<"dog_media">,
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("dog_media").insert(media);
  if (error) return { error: error.message };
  revalidatePath(`/admin/dogs/${media.dog_id}`);
  return {};
}

export async function deleteDogMedia(
  id: string,
  dogId: string,
  storagePath?: string,
) {
  await requireAdmin();
  const supabase = await createClient();
  if (storagePath) {
    await supabase.storage.from("dog-media").remove([storagePath]);
  }
  await supabase.from("dog_media").delete().eq("id", id);
  revalidatePath(`/admin/dogs/${dogId}`);
}

export async function setPrimaryMedia(id: string, dogId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("dog_media")
    .update({ is_primary: false })
    .eq("dog_id", dogId);
  await supabase.from("dog_media").update({ is_primary: true }).eq("id", id);
  revalidatePath(`/admin/dogs/${dogId}`);
}

export async function saveAchievement(
  input: TablesInsert<"achievements"> & { id?: string },
) {
  await requireAdmin();
  const supabase = await createClient();
  if (input.id) {
    await supabase.from("achievements").update(input).eq("id", input.id);
  } else {
    await supabase.from("achievements").insert(input);
  }
  revalidatePath(`/admin/dogs/${input.dog_id}`);
}

export async function deleteAchievement(id: string, dogId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("achievements").delete().eq("id", id);
  revalidatePath(`/admin/dogs/${dogId}`);
}

export async function saveVaccination(
  input: TablesInsert<"vaccinations"> & { id?: string },
) {
  await requireAdmin();
  const supabase = await createClient();
  if (input.id) {
    await supabase.from("vaccinations").update(input).eq("id", input.id);
  } else {
    await supabase.from("vaccinations").insert(input);
  }
  revalidatePath(`/admin/dogs/${input.dog_id}`);
}

export async function deleteVaccination(id: string, dogId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("vaccinations").delete().eq("id", id);
  revalidatePath(`/admin/dogs/${dogId}`);
}
