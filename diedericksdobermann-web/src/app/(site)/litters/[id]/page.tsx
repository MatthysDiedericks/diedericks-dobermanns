import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WaitlistForm } from "@/components/forms/WaitlistForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dogPrimaryImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { formatDate } from "@/lib/utils";
import type { DogMedia } from "@/types/app";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("litters")
    .select("id")
    .eq("is_public", true);
  return (data ?? []).map((l) => ({ id: l.id }));
}

type ParentDog = {
  id: string;
  name: string;
  is_public: boolean;
  dog_media: DogMedia[];
};

async function getLitter(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("litters")
    .select(
      "*, mother:dogs!litters_mother_id_fkey(id,name,is_public,dog_media(*)), father:dogs!litters_father_id_fkey(id,name,is_public,dog_media(*))",
    )
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const litter = await getLitter(id);
  if (!litter) return { title: "Litter Not Found" };
  return {
    title: litter.name ?? "Litter",
    description:
      litter.description ?? "An upcoming Dobermann litter at Diedericks Dobermanns.",
  };
}

export default async function LitterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const litter = await getLitter(id);
  if (!litter) notFound();

  const mother = litter.mother as unknown as ParentDog | null;
  const father = litter.father as unknown as ParentDog | null;
  const title =
    mother?.name && father?.name
      ? `${father.name} × ${mother.name}`
      : (litter.name ?? "Planned Litter");

  return (
    <article className="mx-auto max-w-5xl px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <Link
        href="/litters"
        className="font-cinzel text-xs uppercase tracking-widest text-muted hover:text-gold"
      >
        ← All Litters
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={litter.status} />
      </div>
      <h1 className="mt-4 font-cinzel text-4xl font-bold text-text">{title}</h1>

      <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <Stat label="Expected" value={formatDate(litter.expected_date)} />
        <Stat
          label="Puppies"
          value={litter.puppy_count ? String(litter.puppy_count) : "TBC"}
        />
        <Stat
          label="Available"
          value={
            litter.available_count !== null
              ? String(litter.available_count)
              : "TBC"
          }
        />
      </dl>

      {litter.description ? (
        <p className="mt-8 max-w-2xl leading-relaxed text-muted">
          {litter.description}
        </p>
      ) : null}

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <ParentCard role="Sire" parent={father} />
        <ParentCard role="Dam" parent={mother} />
      </div>

      <div className="mt-16 rounded-sm border border-gold/20 bg-surface p-8 md:p-10">
        <SectionHeader
          eyebrow="Register Your Interest"
          title="Join The Waitlist"
          align="left"
        />
        <p className="mt-4 text-sm text-muted">
          Spaces in this litter are limited and allocated by application. Add
          your details below and we&apos;ll be in touch.
        </p>
        <div className="mt-8">
          <WaitlistForm litterId={litter.id} litterName={title} />
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-subtle">{label}</dt>
      <dd className="mt-1 font-cinzel text-lg text-gold">{value}</dd>
    </div>
  );
}

function ParentCard({
  role,
  parent,
}: {
  role: string;
  parent: ParentDog | null;
}) {
  const image = parent ? dogPrimaryImage(parent.dog_media) : null;
  const inner = (
    <div className="overflow-hidden rounded-sm border border-gold/20 bg-surface">
      <div className="relative aspect-[4/3]">
        {image ? (
          <Image
            src={image}
            alt={parent?.name ?? role}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-elevated">
            <span className="font-cinzel text-4xl text-gold/20">DD</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="font-cinzel text-xs uppercase tracking-widest text-gold-dim">
          {role}
        </p>
        <p className="mt-1 font-cinzel text-lg text-text">
          {parent?.name ?? "To be confirmed"}
        </p>
      </div>
    </div>
  );

  if (parent?.is_public) {
    return (
      <Link href={`/dogs/${parent.id}`} className="group block">
        {inner}
      </Link>
    );
  }
  return inner;
}
