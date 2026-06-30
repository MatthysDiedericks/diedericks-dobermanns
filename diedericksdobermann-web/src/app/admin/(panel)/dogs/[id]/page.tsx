import { notFound } from "next/navigation";

import { AchievementsManager } from "@/components/admin/AchievementsManager";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteDogButton } from "@/components/admin/DeleteDogButton";
import { DogForm } from "@/components/admin/DogForm";
import { MediaManager } from "@/components/admin/MediaManager";
import { VaccinationsManager } from "@/components/admin/VaccinationsManager";
import { cardClass } from "@/lib/admin/styles";
import { createClient } from "@/lib/supabase/server";
import type { Achievement, DogMedia, Vaccination } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function EditDogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: dog }, { data: allDogs }, { data: media }, { data: achievements }, { data: vaccinations }] =
    await Promise.all([
      supabase.from("dogs").select("*").eq("id", id).maybeSingle(),
      supabase.from("dogs").select("id, name").order("name"),
      supabase.from("dog_media").select("*").eq("dog_id", id),
      supabase
        .from("achievements")
        .select("*")
        .eq("dog_id", id)
        .order("trial_date", { ascending: false }),
      supabase
        .from("vaccinations")
        .select("*")
        .eq("dog_id", id)
        .order("date_administered", { ascending: false }),
    ]);

  if (!dog) notFound();

  return (
    <>
      <AdminHeader title={dog.name} subtitle="Edit dog profile" />

      <div className="space-y-8">
        <Section title="Details">
          <DogForm dog={dog} parents={allDogs ?? []} />
        </Section>

        <Section title="Media">
          <MediaManager dogId={id} media={(media ?? []) as DogMedia[]} />
        </Section>

        <Section title="Achievements">
          <AchievementsManager
            dogId={id}
            items={(achievements ?? []) as Achievement[]}
          />
        </Section>

        <Section title="Vaccinations">
          <VaccinationsManager
            dogId={id}
            items={(vaccinations ?? []) as Vaccination[]}
          />
        </Section>

        <Section title="Danger Zone">
          <DeleteDogButton dogId={id} />
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${cardClass} p-6`}>
      <h2 className="mb-5 font-cinzel text-lg uppercase tracking-widest text-gold-dim">
        {title}
      </h2>
      {children}
    </div>
  );
}
