import { AdminHeader } from "@/components/admin/AdminHeader";
import { DogsTable } from "@/components/admin/DogsTable";
import { createClient } from "@/lib/supabase/server";
import type { DogWithMedia } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminDogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dogs")
    .select("*, dog_media(*)")
    .order("created_at", { ascending: false });

  const dogs = (data ?? []) as DogWithMedia[];

  return (
    <>
      <AdminHeader
        title="Dogs"
        subtitle={`${dogs.length} total`}
        action={{ href: "/admin/dogs/new", label: "Add Dog" }}
      />
      <DogsTable dogs={dogs} />
    </>
  );
}
