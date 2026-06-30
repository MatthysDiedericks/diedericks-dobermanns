"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "in_training", label: "In Training" },
  { key: "breeding", label: "Studs & Dams" },
  { key: "standard", label: "Standard" },
  { key: "elite", label: "Elite" },
  { key: "protection", label: "Protection Dogs" },
];

export function DogFilters({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const select = (key: string) => {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("filter");
    else next.set("filter", key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => select(f.key)}
          className={cn(
            "rounded-sm border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest transition-colors",
            active === f.key
              ? "border-gold bg-gold/10 text-gold"
              : "border-border text-muted hover:border-gold/40 hover:text-gold",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
