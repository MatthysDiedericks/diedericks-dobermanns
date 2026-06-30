import type { Metadata } from "next";

import { Markdown } from "@/components/ui/Markdown";
import { PrintButton } from "@/components/ui/PrintButton";
import { readContent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "App Terms & Conditions",
  description: "Terms and conditions for the Diedericks Dobermanns mobile application.",
};

export default async function TermsPage() {
  const markdown = await readContent("app-terms-and-conditions").catch(() => "");

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-cinzel text-3xl font-bold text-gold md:text-4xl">
          App Terms &amp; Conditions
        </h1>
        <PrintButton />
      </div>
      <p className="mb-8 text-sm text-muted">
        These terms apply to the Diedericks Dobermanns mobile app. For puppy purchase terms, see{" "}
        <a href="/terms-of-sale" className="text-gold underline">
          Terms &amp; Conditions of Sale
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
