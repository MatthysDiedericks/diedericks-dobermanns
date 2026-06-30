import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/ui/PageHero";
import { dogPrimaryImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";
import type { Achievement, DogMedia } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Achievements",
  description:
    "Titles, trial results, and sport accomplishments earned by Diedericks Dobermanns dogs.",
};

type DogWithAchievements = {
  id: string;
  name: string;
  category: string;
  is_public: boolean;
  dog_media: DogMedia[];
  achievements: Achievement[];
};

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dogs")
    .select("id, name, category, is_public, dog_media(*), achievements(*)")
    .eq("is_public", true);

  const dogs = ((data ?? []) as unknown as DogWithAchievements[])
    .filter((d) => d.achievements && d.achievements.length > 0)
    .map((d) => ({
      ...d,
      achievements: [...d.achievements].sort((a, b) =>
        (b.trial_date ?? "").localeCompare(a.trial_date ?? ""),
      ),
    }))
    .sort((a, b) =>
      (b.achievements[0]?.trial_date ?? "").localeCompare(
        a.achievements[0]?.trial_date ?? "",
      ),
    );

  return (
    <>
      <PageHero
        eyebrow="Proven"
        title="Achievements"
        subtitle="Our standard is not set by clubs — it is proven on the field. These are the results."
      />
      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
        {dogs.length > 0 ? (
          <div className="space-y-12">
            {dogs.map((dog) => {
              const image = dogPrimaryImage(dog.dog_media);
              return (
                <div
                  key={dog.id}
                  className="grid gap-6 rounded-sm border border-gold/20 bg-surface p-6 md:grid-cols-[200px_1fr]"
                >
                  <Link href={`/dogs/${dog.id}`} className="group">
                    <div className="relative aspect-square overflow-hidden rounded-sm border border-gold/20">
                      {image ? (
                        <Image
                          src={image}
                          alt={dog.name}
                          fill
                          sizes="200px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-elevated">
                          <span className="font-cinzel text-4xl text-gold/20">
                            DD
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 font-cinzel text-lg text-text group-hover:text-gold">
                      {dog.name}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-gold-dim">
                      {humanize(dog.category)}
                    </p>
                  </Link>

                  <ul className="space-y-3">
                    {dog.achievements.map((a) => (
                      <li
                        key={a.id}
                        className="border-b border-gold/10 pb-3 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-cinzel text-sm text-text">
                            {a.title}
                          </p>
                          {a.score ? (
                            <span className="text-xs text-gold">{a.score}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {[formatDate(a.trial_date), a.location, a.judge]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center font-cinzel text-sm uppercase tracking-widest text-subtle">
            Achievements will be published here as they are earned.
          </p>
        )}
      </section>
    </>
  );
}
