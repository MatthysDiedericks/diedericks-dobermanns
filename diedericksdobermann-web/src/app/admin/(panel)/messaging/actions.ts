"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type BroadcastInput = {
  group_id: string | null;
  title: string;
  body: string;
  image_url: string | null;
  channels: string[];
  scheduled_for: string | null;
};

export async function sendBroadcast(
  input: BroadcastInput,
): Promise<{ error?: string }> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  let recipientCount = 0;
  if (input.group_id) {
    const { count } = await supabase
      .from("client_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", input.group_id);
    recipientCount = count ?? 0;
  } else {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "client");
    recipientCount = count ?? 0;
  }

  const scheduled = !!input.scheduled_for;
  const { error } = await supabase.from("broadcast_messages").insert({
    group_id: input.group_id,
    title: input.title,
    body: input.body,
    image_url: input.image_url,
    channels: input.channels.length ? input.channels : ["push"],
    status: scheduled ? "scheduled" : "sent",
    scheduled_for: input.scheduled_for,
    sent_at: scheduled ? null : new Date().toISOString(),
    sent_by: user.id,
    recipient_count: recipientCount,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/messaging");
  return {};
}
