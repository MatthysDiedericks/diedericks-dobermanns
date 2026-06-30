import type { Metadata } from "next";

import { Markdown } from "@/components/ui/Markdown";
import { PrintButton } from "@/components/ui/PrintButton";
import { readContent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for the Diedericks Dobermanns mobile application and client services.",
};

export default async function PrivacyPolicyPage() {
  const markdown = await readContent("privacy-policy").catch(() => "");

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-cinzel text-3xl font-bold text-gold md:text-4xl">
          Privacy Policy
        </h1>
        <PrintButton />
      </div>
      {markdown ? (
        <Markdown>{markdown}</Markdown>
      ) : (
        <p className="text-muted">Privacy policy is being finalised.</p>
      )}
    </section>
  );
}
