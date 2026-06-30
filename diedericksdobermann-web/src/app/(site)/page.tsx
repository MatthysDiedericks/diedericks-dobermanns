import Image from "next/image";
import Link from "next/link";

import { Testimonials } from "@/components/home/Testimonials";
import { DogCard } from "@/components/ui/DogCard";
import { GoldLink } from "@/components/ui/GoldButton";
import { LitterCard } from "@/components/ui/LitterCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { extractSection, readContent } from "@/lib/content";
import { getSettings, SETTINGS_KEYS } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type {
  DogWithMedia,
  LitterWithParents,
  Testimonial,
} from "@/types/app";

export const revalidate = 60;

const TIERS = [
  {
    name: "Standard Puppies",
    body: "Purebred Dobermann puppies from health-tested, selectively bred parents. The right start, from people who know the breed.",
    href: "/dogs?category=standard",
    featured: false,
  },
  {
    name: "Elite Developed Puppies",
    body: "Developed in-kennel to six months — obedience foundation, protection introduction, and real-world environmental exposure.",
    href: "/dogs?category=elite",
    featured: true,
  },
  {
    name: "Family Protection Dogs",
    body: "Fully developed protection dogs, trained and proven. The pinnacle of what a Dobermann can be for a discerning family.",
    href: "/dogs?category=protection",
    featured: false,
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const settings = await getSettings();

  const [{ data: dogs }, { data: litters }, { data: testimonials }, aboutMd] =
    await Promise.all([
      supabase
        .from("dogs")
        .select("*, dog_media(*)")
        .eq("is_public", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("litters")
        .select(
          "*, mother:dogs!litters_mother_id_fkey(id,name), father:dogs!litters_father_id_fkey(id,name)",
        )
        .eq("is_public", true)
        .in("status", ["planned", "expected"])
        .order("expected_date", { ascending: true })
        .limit(4),
      supabase
        .from("testimonials")
        .select("*")
        .eq("is_approved", true)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(4),
      readContent("about-us").catch(() => ""),
    ]);

  const featuredDogs = (dogs ?? []) as DogWithMedia[];
  const expectedLitters = (litters ?? []) as unknown as LitterWithParents[];
  const featuredTestimonials = (testimonials ?? []) as Testimonial[];
  const aboutParagraphs = aboutMd
    ? extractSection(aboutMd, "WHO WE ARE").slice(0, 2)
    : [];

  const heroImage = settings[SETTINGS_KEYS.heroImage];
  const appStoreUrl = settings[SETTINGS_KEYS.appStore];
  const playStoreUrl = settings[SETTINGS_KEYS.playStore];

  return (
    <>
      {/* 1 — HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {heroImage ? (
          <Image
            src={heroImage}
            alt="Diedericks Dobermann"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-elevated via-background to-background" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(17,16,8,0.35) 0%, rgba(17,16,8,0.88) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
          <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-gold">
            Established in Excellence
          </p>
          <h1 className="mt-6 font-cinzel text-4xl font-black leading-tight text-text sm:text-5xl md:text-6xl">
            Born With Purpose.
            <br />
            Built With Discipline.
          </h1>
          <p className="mt-6 font-cinzel text-lg italic text-gold">
            Precision bred. Professionally trained. Lifetime proven.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <GoldLink href="/dogs" size="lg">
              View Our Dogs
            </GoldLink>
            <GoldLink href="/apply" variant="secondary" size="lg">
              Apply for a Dog
            </GoldLink>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <svg
            className="animate-bounce-chevron h-6 w-6 text-gold"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* 2 — FEATURED DOGS */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeader eyebrow="The Standard" title="Our Dogs" />
        {featuredDogs.length > 0 ? (
          <>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredDogs.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/dogs"
                className="font-cinzel text-sm uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
              >
                View All Dogs →
              </Link>
            </div>
          </>
        ) : (
          <EmptyNote text="Our featured dogs will appear here soon." />
        )}
      </section>

      <Rule />

      {/* 3 — EXPECTED LITTERS */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeader eyebrow="The Next Generation" title="Expected Litters" />
          {expectedLitters.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {expectedLitters.map((litter) => (
                <LitterCard key={litter.id} litter={litter} />
              ))}
            </div>
          ) : (
            <EmptyNote text="No litters currently planned. Register your interest below." />
          )}
        </div>
      </section>

      {/* 4 — PRODUCT TIERS */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeader eyebrow="Our Programmes" title="How We Place" />
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.featured
                  ? "rounded-sm border border-gold bg-gold/5 p-8 lg:-mt-4 lg:pb-12"
                  : "rounded-sm border border-gold/20 bg-surface p-8"
              }
            >
              <div className="h-px w-12 bg-gold" />
              <h3 className="mt-5 font-cinzel text-xl text-text">
                {tier.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {tier.body}
              </p>
              <Link
                href={tier.href}
                className="mt-6 inline-block font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light"
              >
                Learn More →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* 5 — ABOUT TEASER */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-gold/20">
            {heroImage ? (
              <Image
                src={heroImage}
                alt="Diedericks Dobermanns"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-elevated">
                <span className="font-cinzel text-6xl text-gold/20">DD</span>
              </div>
            )}
          </div>
          <div>
            <SectionHeader
              eyebrow="Our Story"
              title="Who We Are"
              align="left"
            />
            <div className="mt-6 space-y-4 text-muted leading-relaxed">
              {aboutParagraphs.length > 0 ? (
                aboutParagraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>
                  An elite Dobermann breeding and professional training
                  operation with an unwavering commitment to producing
                  exceptional dogs.
                </p>
              )}
            </div>
            <div className="mt-8">
              <GoldLink href="/about" variant="secondary">
                Read Our Story
              </GoldLink>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — TESTIMONIALS */}
      {featuredTestimonials.length > 0 ? (
        <section className="bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-20 md:px-8 md:py-28">
            <SectionHeader eyebrow="In Their Words" title="What Our Clients Say" />
            <div className="mt-12">
              <Testimonials items={featuredTestimonials} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 7 — APP DOWNLOAD */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="The Client Experience"
              title="Manage Everything From Your Phone"
              align="left"
            />
            <p className="mt-6 text-muted leading-relaxed">
              Our clients get exclusive access to the Diedericks Dobermanns app
              — track your reservation, view your dog&apos;s progress, receive
              updates, and connect with our team directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <StoreBadge
                href={appStoreUrl}
                label="App Store"
                sub="Download on the"
              />
              <StoreBadge
                href={playStoreUrl}
                label="Google Play"
                sub="Get it on"
              />
            </div>
          </div>
          <div className="relative mx-auto aspect-[9/16] w-56 overflow-hidden rounded-2xl border border-gold/30 bg-elevated">
            <div className="flex h-full items-center justify-center">
              <span className="font-cinzel text-2xl tracking-widest text-gold/40">
                DD APP
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 8 — CONTACT STRIP */}
      <section className="border-y border-gold/30 bg-gold/5">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8">
          <h2 className="font-cinzel text-3xl font-bold text-gold">
            Ready To Begin?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Applications are reviewed personally. We place quality over volume.
          </p>
          <div className="mt-8">
            <GoldLink href="/apply" size="lg">
              Apply for a Dog
            </GoldLink>
          </div>
        </div>
      </section>
    </>
  );
}

function Rule() {
  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="h-px w-full bg-gold/20" />
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="mt-12 text-center font-cinzel text-sm uppercase tracking-widest text-subtle">
      {text}
    </p>
  );
}

function StoreBadge({
  href,
  label,
  sub,
}: {
  href?: string;
  label: string;
  sub: string;
}) {
  const className =
    "flex items-center gap-3 rounded-sm border border-gold/40 bg-background px-5 py-3 transition-colors hover:border-gold";
  const content = (
    <>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-widest text-subtle">
          {sub}
        </p>
        <p className="font-cinzel text-sm text-text">{label}</p>
      </div>
    </>
  );
  if (!href) {
    return (
      <span className={`${className} opacity-50`} aria-disabled>
        {content}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}
