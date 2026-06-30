import { AdminHeader } from "@/components/admin/AdminHeader";
import { FaqManager } from "@/components/admin/FaqManager";
import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminFaqPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faq")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <AdminHeader title="FAQ" subtitle="Manage published questions and order." />
      <FaqManager items={(data ?? []) as Faq[]} />
    </>
  );
}
