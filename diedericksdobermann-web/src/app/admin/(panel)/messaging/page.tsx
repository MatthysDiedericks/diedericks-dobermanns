import { AdminHeader } from "@/components/admin/AdminHeader";
import { MessagingComposer } from "@/components/admin/MessagingComposer";
import { createClient } from "@/lib/supabase/server";
import type { BroadcastMessage, ClientGroup } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminMessagingPage() {
  const supabase = await createClient();

  const [groups, history] = await Promise.all([
    supabase.from("client_groups").select("*").order("name"),
    supabase
      .from("broadcast_messages")
      .select("*, group:client_groups(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <AdminHeader
        title="Messaging"
        subtitle="Compose broadcasts to clients and groups."
      />
      <MessagingComposer
        groups={(groups.data ?? []) as ClientGroup[]}
        history={
          (history.data ?? []) as unknown as (BroadcastMessage & {
            group: { name: string } | null;
          })[]
        }
      />
    </>
  );
}
