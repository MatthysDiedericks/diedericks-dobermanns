import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center font-cinzel uppercase tracking-[0.18em] rounded-sm transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-1 focus-visible:ring-gold";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-background hover:bg-gold-light shadow-[0_0_0_0_rgba(196,163,90,0)] hover:shadow-[0_0_24px_-4px_rgba(196,163,90,0.5)]",
  secondary:
    "border border-gold text-gold bg-transparent hover:bg-gold/10",
};

const sizes: Record<Size, string> = {
  sm: "text-[11px] px-4 py-2",
  md: "text-xs px-6 py-3",
  lg: "text-sm px-8 py-4",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function GoldButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function GoldLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}
