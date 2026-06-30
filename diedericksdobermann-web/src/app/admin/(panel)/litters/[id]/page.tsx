import { notFound } from "next/navigation";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { LitterForm } from "@/components/admin/LitterForm";
import {
  WaitlistManager,
  type WaitlistRow,
} from "@/components/admin/WaitlistManager";
import { cardClass } from "@/lib/admin/styles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditLitterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: litter }, { data: dogs }, { data: waitlist }] =
    await Promise.all([
      supabase.from("litters").select("*").eq("id", id).maybeSingle(),
      supabase.from("dogs").select("id, name").order("name"),
      supabase
        .from("waiting_list")
        .select("id, position, preference_notes, status, client:users(full_name)")
        .eq("litter_id", id)
        .order("position", { ascending: true }),
    ]);

  if (!litter) notFound();

  return (
    <>
      <AdminHeader title={litter.name ?? "Litter"} subtitle="Edit litter" />

      <div className="space-y-8">
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-5 font-cinzel text-lg uppercase tracking-widest text-gold-dim">
            Details
          </h2>
          <LitterForm litter={litter} dogs={dogs ?? []} />
        </div>

        <div className={`${cardClass} p-6`}>
          <h2 className="mb-5 font-cinzel text-lg uppercase tracking-widest text-gold-dim">
            Waiting List
          </h2>
          <WaitlistManager
            litterId={id}
            rows={(waitlist ?? []) as unknown as WaitlistRow[]}
          />
        </div>
      </div>
    </>
  );
}
