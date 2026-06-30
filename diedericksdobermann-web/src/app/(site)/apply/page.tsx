import type { Metadata } from "next";

import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { PageHero } from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Apply for a Dog",
  description:
    "Apply for a Diedericks Dobermann. Applications are reviewed personally — we place quality over volume.",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ dog_id?: string }>;
}) {
  const { dog_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: dogs }, { data: litters }] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name")
      .eq("is_public", true)
      .eq("status", "available")
      .order("name"),
    supabase
      .from("litters")
      .select("id, name, expected_date")
      .eq("is_public", true)
      .in("status", ["planned", "expected"])
      .order("expected_date"),
  ]);

  const dogOptions = (dogs ?? []).map((d) => ({ id: d.id, label: d.name }));
  const litterOptions = (litters ?? []).map((l) => ({
    id: l.id,
    label: l.name ?? "Planned litter",
  }));

  return (
    <>
      <PageHero
        eyebrow="Begin Here"
        title="Apply for a Dog"
        subtitle="Applications are reviewed personally. We place quality over volume."
      />
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <ApplicationForm
          dogs={dogOptions}
          litters={litterOptions}
          initialDogId={dog_id}
        />
      </section>
    </>
  );
}
