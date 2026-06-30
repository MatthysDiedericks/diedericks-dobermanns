"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dogs", label: "Our Dogs" },
  { href: "/litters", label: "Litters" },
  { href: "/training", label: "Training" },
  { href: "/gallery", label: "Gallery" },
  { href: "/achievements", label: "Achievements" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-gold/20 bg-background/90 backdrop-blur-md"
          : "border-transparent bg-gradient-to-b from-background/80 to-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="font-cinzel text-base tracking-[0.2em] text-gold md:text-lg"
        >
          DIEDERICKS DOBERMANNS
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative font-cinzel text-xs uppercase tracking-widest transition-colors hover:text-gold",
                isActive(link.href) ? "text-gold" : "text-muted",
              )}
            >
              {link.label}
              {isActive(link.href) ? (
                <span className="absolute -bottom-1.5 left-0 h-px w-full bg-gold" />
              ) : null}
            </Link>
          ))}
          <Link
            href="/apply"
            className="rounded-sm border border-gold px-5 py-2 font-cinzel text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold/10"
          >
            Apply
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center text-gold lg:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className={cn(
                "absolute left-0 h-px w-6 bg-current transition-all",
                open ? "top-2 rotate-45" : "top-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-2 h-px w-6 bg-current transition-all",
                open ? "opacity-0" : "opacity-100",
              )}
            />
            <span
              className={cn(
                "absolute left-0 h-px w-6 bg-current transition-all",
                open ? "top-2 -rotate-45" : "top-4",
              )}
            />
          </span>
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-t border-gold/10 bg-background/95 backdrop-blur-md transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[28rem]" : "max-h-0",
        )}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "py-2 font-cinzel text-sm uppercase tracking-widest transition-colors",
                isActive(link.href) ? "text-gold" : "text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/apply"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-sm border border-gold px-5 py-3 text-center font-cinzel text-sm uppercase tracking-widest text-gold"
          >
            Apply
          </Link>
        </div>
      </div>
    </header>
  );
}
