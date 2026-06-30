"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export async function replyEnquiry(id: string, notes: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("enquiries")
    .update({
      admin_notes: notes,
      status: "replied",
      replied_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/enquiries");
}

export async function setEnquiryStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("enquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/enquiries");
}
