import type { Metadata } from "next";

import { DogFilters } from "@/components/dogs/DogFilters";
import { DogCard } from "@/components/ui/DogCard";
import { PageHero } from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";
import type { DogWithMedia } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our Dogs",
  description:
    "Browse our available Dobermanns — standard puppies, elite developed dogs, and family protection dogs, all precision bred and professionally trained.",
};

const STATUS_FILTERS = new Set(["available", "in_training"]);
const CATEGORY_FILTERS = new Set(["breeding", "standard", "elite", "protection"]);

export default async function DogsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("dogs")
    .select("*, dog_media(*)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (STATUS_FILTERS.has(filter)) query = query.eq("status", filter);
  else if (CATEGORY_FILTERS.has(filter)) query = query.eq("category", filter);

  const { data } = await query;
  const dogs = (data ?? []) as DogWithMedia[];

  return (
    <>
      <PageHero
        eyebrow="The Standard"
        title="Our Dogs"
        subtitle="Every dog we place is health-tested, temperament-evaluated, and raised with discipline. This is what we stand behind."
      />

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <DogFilters active={filter} />

        <p className="mt-8 text-center font-cinzel text-xs uppercase tracking-widest text-subtle">
          Showing {dogs.length} {dogs.length === 1 ? "dog" : "dogs"}
        </p>

        {dogs.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} />
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <p className="font-cinzel text-lg text-gold">No dogs to show</p>
            <p className="mt-2 text-sm text-muted">
              There are no dogs matching this selection right now. Please check
              back soon or make an enquiry.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
