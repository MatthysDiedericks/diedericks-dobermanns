import type { Metadata } from "next";

import { Markdown } from "@/components/ui/Markdown";
import { PrintButton } from "@/components/ui/PrintButton";
import { readContent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Terms & Conditions of Sale",
  description:
    "Terms and conditions for puppy purchases and sales from Diedericks Dobermanns.",
};

export default async function TermsOfSalePage() {
  const markdown = await readContent("terms-and-conditions").catch(() => "");

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-cinzel text-3xl font-bold text-gold md:text-4xl">
          Terms &amp; Conditions of Sale
        </h1>
        <PrintButton />
      </div>
      <p className="mb-8 text-sm text-muted">
        These terms govern puppy purchases and sales. For mobile app usage, see our{" "}
        <a href="/terms" className="text-gold underline">
          App Terms &amp; Conditions
        </a>
        .
      </p>
      {markdown ? (
        <Markdown>{markdown}</Markdown>
      ) : (
        <p className="text-muted">Terms are being finalised.</p>
      )}
    </section>
  );
}
