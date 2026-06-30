import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DogGallery } from "@/components/dogs/DogGallery";
import { DogTabs } from "@/components/dogs/DogTabs";
import { EnquiryModal } from "@/components/dogs/EnquiryModal";
import { VaccinationTimeline } from "@/components/dogs/VaccinationTimeline";
import { GoldLink } from "@/components/ui/GoldButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dogPrimaryImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { ageFromDob, formatDate, formatPrice, humanize } from "@/lib/utils";
import type { Achievement, DogMedia, Vaccination } from "@/types/app";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("dogs")
    .select("id")
    .eq("is_public", true);
  return (data ?? []).map((d) => ({ slug: d.id }));
}

async function getDog(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dogs")
    .select(
      "*, dog_media(*), mother:dogs!dogs_mother_id_fkey(id,name,is_public), father:dogs!dogs_father_id_fkey(id,name,is_public)",
    )
    .eq("id", slug)
    .eq("is_public", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dog = await getDog(slug);
  if (!dog) return { title: "Dog Not Found" };
  const image = dogPrimaryImage(dog.dog_media as DogMedia[]);
  return {
    title: dog.name,
    description:
      dog.description ??
      `${dog.name} — a ${humanize(dog.category)} Dobermann from Diedericks Dobermanns.`,
    openGraph: { images: image ? [image] : ["/og-image.jpg"] },
  };
}

export default async function DogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dog = await getDog(slug);
  if (!dog) notFound();

  const supabase = await createClient();
  const [{ data: achievements }, { data: vaccinations }] = await Promise.all([
    supabase
      .from("achievements")
      .select("*")
      .eq("dog_id", dog.id)
      .order("trial_date", { ascending: false }),
    supabase
      .from("vaccinations")
      .select("*")
      .eq("dog_id", dog.id)
      .order("date_administered", { ascending: false }),
  ]);

  const media = (dog.dog_media ?? []) as DogMedia[];
  type ParentRef = { id: string; name: string; is_public: boolean };
  const mother = dog.mother as unknown as ParentRef | null;
  const father = dog.father as unknown as ParentRef | null;
  const price = formatPrice(dog.price);

  const details: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Date of Birth", value: formatDate(dog.date_of_birth) },
    { label: "Age", value: ageFromDob(dog.date_of_birth) ?? "—" },
    { label: "Colour", value: dog.colour ?? "—" },
    { label: "Sex", value: dog.sex ? humanize(dog.sex) : "—" },
    {
      label: "Sire",
      value: parentNode(father),
    },
    {
      label: "Dam",
      value: parentNode(mother),
    },
    { label: "Bloodline", value: dog.bloodline ?? "—" },
    { label: "Microchip", value: dog.microchip_number ?? "—" },
  ];

  const health: Array<{ label: string; value: string | null }> = [
    { label: "DCM", value: dog.dcm_status },
    { label: "Hips", value: dog.hip_score },
    { label: "Elbows", value: dog.elbow_score },
  ];

  return (
    <article className="mx-auto max-w-7xl px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <Link
        href="/dogs"
        className="font-cinzel text-xs uppercase tracking-widest text-muted hover:text-gold"
      >
        ← All Dogs
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <DogGallery media={media} name={dog.name} />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={dog.status} />
            <StatusBadge status={dog.category} tone="gold" />
          </div>
          <h1 className="mt-4 font-cinzel text-4xl font-bold text-text">
            {dog.name}
          </h1>
          {price ? (
            <p className="mt-2 font-cinzel text-xl text-gold">{price}</p>
          ) : null}

          <dl className="mt-8 grid grid-cols-2 gap-5">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs uppercase tracking-widest text-subtle">
                  {d.label}
                </dt>
                <dd className="mt-1 text-sm text-muted">{d.value}</dd>
              </div>
            ))}
          </dl>

          {health.some((h) => h.value) ? (
            <div className="mt-8">
              <p className="font-cinzel text-xs uppercase tracking-widest text-gold-dim">
                Health Testing
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {health
                  .filter((h) => h.value)
                  .map((h) => (
                    <span
                      key={h.label}
                      className="inline-flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300"
                    >
                      <span className="text-emerald-400">✓</span>
                      {h.label}: {h.value}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 space-y-3">
            {dog.status === "available" ? (
              <GoldLink href={`/apply?dog_id=${dog.id}`} className="w-full">
                Apply for This Dog
              </GoldLink>
            ) : null}
            <EnquiryModal dogId={dog.id} dogName={dog.name} />
          </div>
        </div>
      </div>

      <div className="mt-12">
        <DogTabs
          description={dog.description}
          training={dog.training_notes}
          temperament={dog.temperament_notes}
        />
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {(achievements ?? []).length > 0 ? (
          <section>
            <h2 className="font-cinzel text-2xl text-gold">Achievements</h2>
            <div className="mt-5 space-y-3">
              {(achievements as Achievement[]).map((a) => (
                <div
                  key={a.id}
                  className="rounded-sm border border-gold/20 bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-cinzel text-sm text-text">{a.title}</p>
                    {a.score ? (
                      <span className="text-xs text-gold">{a.score}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {[formatDate(a.trial_date), a.location, a.judge]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(vaccinations ?? []).length > 0 ? (
          <section>
            <h2 className="font-cinzel text-2xl text-gold">
              Vaccination Timeline
            </h2>
            <div className="mt-5">
              <VaccinationTimeline items={vaccinations as Vaccination[]} />
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function parentNode(
  parent: { id: string; name: string; is_public: boolean } | null,
) {
  if (!parent) return "—";
  if (parent.is_public) {
    return (
      <Link href={`/dogs/${parent.id}`} className="text-gold hover:underline">
        {parent.name}
      </Link>
    );
  }
  return parent.name;
}
