import { AdminHeader } from "@/components/admin/AdminHeader";
import { LitterForm } from "@/components/admin/LitterForm";
import { cardClass } from "@/lib/admin/styles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewLitterPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("dogs").select("id, name").order("name");

  return (
    <>
      <AdminHeader title="Add Litter" />
      <div className={`${cardClass} p-6`}>
        <LitterForm litter={null} dogs={data ?? []} />
      </div>
    </>
  );
}
