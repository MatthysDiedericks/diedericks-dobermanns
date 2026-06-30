"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateApplication(
  id: string,
  patch: { status?: string; admin_notes?: string },
) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("applications")
    .update({
      ...patch,
      ...(patch.status
        ? { reviewed_at: new Date().toISOString(), reviewed_by: user.id }
        : {}),
    })
    .eq("id", id);
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
}
