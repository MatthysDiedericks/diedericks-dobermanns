import type { Metadata } from "next";

import { LitterCard } from "@/components/ui/LitterCard";
import { PageHero } from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";
import type { LitterWithParents } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Litters",
  description:
    "Planned and expected Dobermann litters from Diedericks Dobermanns. Register your interest and join the waitlist.",
};

export default async function LittersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("litters")
    .select(
      "*, mother:dogs!litters_mother_id_fkey(id,name), father:dogs!litters_father_id_fkey(id,name)",
    )
    .eq("is_public", true)
    .order("expected_date", { ascending: true });

  const litters = (data ?? []) as unknown as LitterWithParents[];

  return (
    <>
      <PageHero
        eyebrow="The Next Generation"
        title="Our Litters"
        subtitle="Carefully planned pairings from health-tested, proven parents. Spaces are limited and allocated by application."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        {litters.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {litters.map((litter) => (
              <LitterCard key={litter.id} litter={litter} />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="font-cinzel text-lg text-gold">
              No litters currently listed
            </p>
            <p className="mt-2 text-sm text-muted">
              We plan our litters carefully and announce them here. Make an
              enquiry to register your interest.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
