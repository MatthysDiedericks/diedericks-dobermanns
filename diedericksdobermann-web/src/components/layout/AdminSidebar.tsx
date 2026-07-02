"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const GROUPS: {
  title: string;
  items: { href: string; label: string }[];
}[] = [
  {
    title: "Breeding",
    items: [
      { href: "/admin/litters", label: "Litters" },
      { href: "/admin/dogs", label: "Puppies / Dogs" },
      { href: "/admin/heats", label: "Heat Cycles" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/admin/waitlist", label: "Waiting List" },
      { href: "/admin/applications", label: "Applications" },
      { href: "/admin/enquiries", label: "Enquiries" },
      { href: "/admin/contracts", label: "Contracts" },
      { href: "/admin/finance", label: "Finance" },
      { href: "/admin/training", label: "Training Bookings" },
    ],
  },
  {
    title: "Communication",
    items: [{ href: "/admin/messaging", label: "Messaging" }],
  },
  {
    title: "Kennel",
    items: [
      { href: "/admin/documents", label: "Documents" },
      { href: "/admin/todos", label: "To-Do Items" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/gallery", label: "Gallery" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/faq", label: "FAQ" },
    ],
  },
  {
    title: "Settings",
    items: [{ href: "/admin/settings", label: "App Settings" }],
  },
];

export function AdminSidebar({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className="flex items-center justify-between border-b border-gold/20 bg-background px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-cinzel text-sm tracking-widest text-gold">
          DD ADMIN
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-cinzel text-xs uppercase tracking-widest text-gold"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={cn(
          "w-full shrink-0 border-r border-gold/20 bg-background lg:block lg:w-60",
          open ? "block" : "hidden",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden px-6 py-6 lg:block">
            <Link href="/admin" className="font-cinzel text-base tracking-[0.2em] text-gold">
              DD ADMIN
            </Link>
          </div>

          <nav className="flex-1 space-y-6 px-3 py-4">
            <Link
              href="/admin"
              className={cn(
                "block rounded-sm px-3 py-2 font-cinzel text-xs uppercase tracking-widest transition-colors",
                pathname === "/admin"
                  ? "border-l-2 border-gold bg-gold/5 text-gold"
                  : "text-muted hover:bg-gold/5 hover:text-gold",
              )}
            >
              Dashboard
            </Link>
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {group.title}
                </p>
                <div className="mt-2 space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "block rounded-sm px-3 py-2 font-cinzel text-xs uppercase tracking-widest transition-colors",
                        isActive(item.href)
                          ? "border-l-2 border-gold bg-gold/5 text-gold"
                          : "text-muted hover:bg-gold/5 hover:text-gold",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-gold/10 p-4">
            <p className="truncate text-xs text-subtle" title={email}>{email}</p>
            <form action={onSignOut}>
              <button
                type="submit"
                className="mt-2 font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light"
              >
                Sign Out
              </button>
            </form>
            <Link
              href="/"
              className="mt-2 block font-cinzel text-[10px] uppercase tracking-widest text-subtle hover:text-gold"
            >
              View Site →
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
