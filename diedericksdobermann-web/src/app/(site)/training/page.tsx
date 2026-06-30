import type { Metadata } from "next";

import { GoldLink } from "@/components/ui/GoldButton";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getSettings, SETTINGS_KEYS } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, humanize } from "@/lib/utils";
import type { TrainingSessionType } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Training",
  description:
    "Professional Dobermann training rooted in obedience, protection work, and PSA sport. Built for credibility and real-world reliability.",
};

export default async function TrainingPage() {
  const supabase = await createClient();
  const settings = await getSettings();
  const { data } = await supabase
    .from("training_session_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const sessions = (data ?? []) as TrainingSessionType[];
  const appStore = settings[SETTINGS_KEYS.appStore];
  const playStore = settings[SETTINGS_KEYS.playStore];

  return (
    <>
      <PageHero
        eyebrow="The Discipline"
        title="Professional Training"
        subtitle="A dog is only as good as the work behind it. Ours is proven on the field."
      />

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Foundation"
              title="Training Philosophy"
              align="left"
            />
            <div className="mt-6 space-y-4 text-muted leading-relaxed">
              <p>
                We build dogs from the ground up — obedience, drive development,
                environmental confidence, and social stability before any
                protection work begins. Discipline is never harsh; it is
                consistent.
              </p>
              <p>
                Every dog that leaves our care has a foundation that most owners
                could never replicate on their own, and the temperament to live
                calmly in a family home.
              </p>
            </div>
          </div>
          <div>
            <SectionHeader
              eyebrow="Credibility"
              title="PSA Sport"
              align="left"
            />
            <div className="mt-6 space-y-4 text-muted leading-relaxed">
              <p>
                Protection Sports Association (PSA) is among the most demanding
                protection sports in the world — testing courage, control, and
                clarity under genuine pressure.
              </p>
              <p>
                Competing in PSA holds our programme to an external standard. It
                is how we prove, publicly, that our dogs are the real thing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <SectionHeader eyebrow="What We Offer" title="Session Types" />
          {sessions.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-sm border border-gold/20 bg-background p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-cinzel text-lg text-text">{s.name}</h3>
                    {s.price !== null ? (
                      <span className="font-cinzel text-sm text-gold">
                        {formatPrice(s.price, s.currency)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-widest text-gold-dim">
                    {humanize(s.session_format)} · {s.duration_minutes} min
                  </p>
                  {s.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {s.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-center font-cinzel text-sm uppercase tracking-widest text-subtle">
              Session types will be listed here soon.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8 md:py-20">
        <SectionHeader eyebrow="Get Started" title="Book A Session" />
        <p className="mx-auto mt-6 max-w-xl text-muted">
          Download the app to book training sessions and video calls with our
          trainers. Prefer to talk first? Make an enquiry and we&apos;ll guide
          you.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {appStore ? (
            <a
              href={appStore}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-gold/40 px-5 py-3 font-cinzel text-xs uppercase tracking-widest text-gold hover:border-gold"
            >
              App Store
            </a>
          ) : null}
          {playStore ? (
            <a
              href={playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-gold/40 px-5 py-3 font-cinzel text-xs uppercase tracking-widest text-gold hover:border-gold"
            >
              Google Play
            </a>
          ) : null}
          <GoldLink href="/contact" variant="secondary">
            Make an Enquiry
          </GoldLink>
        </div>
      </section>
    </>
  );
}
