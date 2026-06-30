import { AdminHeader } from "@/components/admin/AdminHeader";
import { CreateInvoiceForm } from "@/components/finance/CreateInvoiceForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");

  return (
    <>
      <AdminHeader title="New Invoice" subtitle="Create a client invoice." />
      <CreateInvoiceForm clients={data ?? []} />
    </>
  );
}
