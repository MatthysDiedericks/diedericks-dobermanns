"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveSettings(
  entries: { key: string; value: string }[],
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const rows = entries.map((e) => ({ key: e.key, value: e.value || null }));
  const { error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return {};
}
