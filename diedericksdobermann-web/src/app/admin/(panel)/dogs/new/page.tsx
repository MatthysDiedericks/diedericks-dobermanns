import { AdminHeader } from "@/components/admin/AdminHeader";
import { DogForm } from "@/components/admin/DogForm";
import { cardClass } from "@/lib/admin/styles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewDogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dogs")
    .select("id, name")
    .order("name");

  return (
    <>
      <AdminHeader
        title="Add Dog"
        subtitle="Create the dog, then add media, achievements, and vaccinations."
      />
      <div className={`${cardClass} p-6`}>
        <DogForm dog={null} parents={data ?? []} />
      </div>
    </>
  );
}
