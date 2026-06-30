import type { Metadata } from "next";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { PageHero } from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/types/app";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about our Dobermanns, the application process, training, and ownership.",
};

function slug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default async function FaqPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faq")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const items = (data ?? []) as Faq[];

  const grouped = new Map<string, Faq[]>();
  items.forEach((item) => {
    const cat = item.category ?? "General";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  });
  const categories = [...grouped.keys()];

  return (
    <>
      <PageHero
        eyebrow="Answers"
        title="Frequently Asked Questions"
        subtitle="If your question isn't answered here, please get in touch — we respond personally."
      />
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        {items.length > 0 ? (
          <>
            {categories.length > 1 ? (
              <div className="mb-12 flex flex-wrap justify-center gap-2">
                {categories.map((cat) => (
                  <a
                    key={cat}
                    href={`#${slug(cat)}`}
                    className="rounded-sm border border-border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-muted transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    {cat}
                  </a>
                ))}
              </div>
            ) : null}

            <div className="space-y-12">
              {categories.map((cat) => (
                <div key={cat} id={slug(cat)} className="scroll-mt-24">
                  <h2 className="mb-4 font-cinzel text-xl uppercase tracking-widest text-gold-dim">
                    {cat}
                  </h2>
                  <FaqAccordion items={grouped.get(cat)!} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center font-cinzel text-sm uppercase tracking-widest text-subtle">
            Questions and answers coming soon.
          </p>
        )}
      </section>
    </>
  );
}
