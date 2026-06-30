"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

export async function saveFaq(input: TablesInsert<"faq"> & { id?: string }) {
  await requireAdmin();
  const supabase = await createClient();
  if (input.id) {
    await supabase.from("faq").update(input).eq("id", input.id);
  } else {
    await supabase.from("faq").insert(input);
  }
  revalidatePath("/admin/faq");
}

export async function toggleFaqPublished(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("faq").update({ is_published: value }).eq("id", id);
  revalidatePath("/admin/faq");
}

export async function deleteFaq(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("faq").delete().eq("id", id);
  revalidatePath("/admin/faq");
}

export async function setFaqOrder(orderedIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("faq").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/faq");
}
