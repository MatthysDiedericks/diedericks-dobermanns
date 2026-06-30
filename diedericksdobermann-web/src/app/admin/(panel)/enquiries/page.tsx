import { AdminHeader } from "@/components/admin/AdminHeader";
import { EnquiriesManager } from "@/components/admin/EnquiriesManager";
import { createClient } from "@/lib/supabase/server";
import type { Enquiry } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader title="Enquiries" subtitle="Messages from the contact form." />
      <EnquiriesManager enquiries={(data ?? []) as Enquiry[]} />
    </>
  );
}
