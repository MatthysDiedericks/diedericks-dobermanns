import type { Metadata } from "next";

import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { PageHero } from "@/components/ui/PageHero";
import { getSettings, SETTINGS_KEYS, whatsappLink } from "@/lib/settings";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Diedericks Dobermanns. Enquiries are answered personally.",
};

export default async function ContactPage() {
  const settings = await getSettings();
  const phone = settings[SETTINGS_KEYS.phone];
  const email = settings[SETTINGS_KEYS.email];
  const address = settings[SETTINGS_KEYS.address];
  const mapsEmbed = settings[SETTINGS_KEYS.mapsEmbed];
  const whatsapp = whatsappLink(settings[SETTINGS_KEYS.whatsapp]);

  const socials = [
    { label: "Instagram", href: settings[SETTINGS_KEYS.instagram] },
    { label: "Facebook", href: settings[SETTINGS_KEYS.facebook] },
    { label: "WhatsApp", href: whatsapp ?? undefined },
  ].filter((s) => s.href);

  return (
    <>
      <PageHero
        eyebrow="Get In Touch"
        title="Contact Us"
        subtitle="Every enquiry is read and answered personally. We look forward to hearing from you."
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-cinzel text-2xl text-gold">Details</h2>
            <dl className="mt-6 space-y-5">
              {phone ? (
                <Detail label="Phone">
                  <a href={`tel:${phone}`} className="hover:text-gold">
                    {phone}
                  </a>
                </Detail>
              ) : null}
              {email ? (
                <Detail label="Email">
                  <a href={`mailto:${email}`} className="hover:text-gold">
                    {email}
                  </a>
                </Detail>
              ) : null}
              {address ? <Detail label="Address">{address}</Detail> : null}
            </dl>

            {socials.length > 0 ? (
              <div className="mt-8">
                <p className="font-cinzel text-xs uppercase tracking-widest text-gold-dim">
                  Connect
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm border border-gold/40 px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-gold hover:bg-gold/10"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {mapsEmbed ? (
              <div className="mt-8 overflow-hidden rounded-sm border border-gold/20">
                <iframe
                  src={mapsEmbed}
                  className="aspect-video w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-sm border border-gold/20 bg-surface p-8">
            <h2 className="font-cinzel text-2xl text-gold">Send a Message</h2>
            <div className="mt-6">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-subtle">{label}</dt>
      <dd className="mt-1 text-muted">{children}</dd>
    </div>
  );
}
