"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

export async function addGalleryItem(input: TablesInsert<"gallery_items">) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").insert(input);
  if (error) return { error: error.message };
  revalidatePath("/admin/gallery");
  return {};
}

export async function toggleGalleryFeatured(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("gallery_items")
    .update({ is_featured: value })
    .eq("id", id);
  revalidatePath("/admin/gallery");
}

export async function deleteGalleryItem(id: string, imageUrl?: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  if (imageUrl && imageUrl.includes("/gallery/")) {
    const path = imageUrl.split("/gallery/")[1];
    if (path) await supabase.storage.from("gallery").remove([path]);
  }
  await supabase.from("gallery_items").delete().eq("id", id);
  revalidatePath("/admin/gallery");
}

export async function setGalleryOrder(orderedIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("gallery_items")
        .update({ sort_order: index })
        .eq("id", id),
    ),
  );
  revalidatePath("/admin/gallery");
}
