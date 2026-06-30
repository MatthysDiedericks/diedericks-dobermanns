import type { Metadata } from "next";

import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { PageHero } from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";
import type { GalleryItem } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photography and video of our Dobermanns — dogs, training, events, and achievements.",
};

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });

  const items = (data ?? []) as GalleryItem[];

  return (
    <>
      <PageHero
        eyebrow="In Frame"
        title="Gallery"
        subtitle="Moments from the kennel, the training field, and the lives our dogs share with their families."
      />
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <GalleryGrid items={items} />
      </section>
    </>
  );
}
