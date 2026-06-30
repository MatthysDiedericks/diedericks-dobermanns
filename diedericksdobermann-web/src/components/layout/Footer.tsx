import Link from "next/link";

import { getSettings, SETTINGS_KEYS, whatsappLink } from "@/lib/settings";

const FOOTER_LINKS = [
  { href: "/dogs", label: "Our Dogs" },
  { href: "/litters", label: "Litters" },
  { href: "/training", label: "Training" },
  { href: "/gallery", label: "Gallery" },
  { href: "/achievements", label: "Achievements" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/apply", label: "Apply" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "App Terms" },
  { href: "/terms-of-sale", label: "Sale Terms" },
];

export async function Footer() {
  const settings = await getSettings();
  const socials = [
    { label: "Instagram", href: settings[SETTINGS_KEYS.instagram] },
    { label: "Facebook", href: settings[SETTINGS_KEYS.facebook] },
    {
      label: "WhatsApp",
      href: whatsappLink(settings[SETTINGS_KEYS.whatsapp]) ?? undefined,
    },
  ].filter((s) => s.href);

  return (
    <footer className="mt-auto border-t border-gold/20 bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-cinzel text-lg tracking-[0.2em] text-gold">
              DIEDERICKS DOBERMANNS
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Precision bred. Professionally trained. Lifetime proven. Premium
              European Dobermanns raised with purpose and discipline.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-cinzel text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {socials.length > 0 ? (
            <div>
              <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-gold-dim">
                Follow
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted transition-colors hover:text-gold"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gold/10 pt-6 text-xs text-subtle md:flex-row">
          <p>
            © {new Date().getFullYear()} Diedericks Dobermanns. All rights
            reserved.
          </p>
          <p className="font-cinzel uppercase tracking-widest">
            Built with purpose.
          </p>
        </div>
      </div>
    </footer>
  );
}
