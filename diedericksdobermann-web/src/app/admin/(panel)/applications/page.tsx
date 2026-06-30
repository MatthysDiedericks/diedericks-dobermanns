import { AdminHeader } from "@/components/admin/AdminHeader";
import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader title="Applications" subtitle="Review and triage applications." />
      <ApplicationsTable apps={(data ?? []) as Application[]} />
    </>
  );
}
