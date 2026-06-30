import type { Metadata } from "next";

import { Markdown } from "@/components/ui/Markdown";
import { PageHero } from "@/components/ui/PageHero";
import { readContent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "An elite Dobermann breeding and professional training operation, built on European working lines and an uncompromising standard.",
};

export default async function AboutPage() {
  const markdown = await readContent("about-us").catch(() => "");

  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title="About Diedericks Dobermanns"
        subtitle="We don't breed dogs for everyone. We breed them for people who understand what a Dobermann, at its finest, is capable of."
      />
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        {markdown ? (
          <Markdown>{markdown}</Markdown>
        ) : (
          <p className="text-muted">Our story is being written. Check back soon.</p>
        )}
      </section>
    </>
  );
}
