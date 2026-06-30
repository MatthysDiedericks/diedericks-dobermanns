"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Tab = { key: string; label: string; content: string };

export function DogTabs({
  description,
  training,
  temperament,
}: {
  description?: string | null;
  training?: string | null;
  temperament?: string | null;
}) {
  const tabs: Tab[] = [
    description ? { key: "desc", label: "Description", content: description } : null,
    training
      ? { key: "training", label: "Training Notes", content: training }
      : null,
    temperament
      ? { key: "temperament", label: "Temperament", content: temperament }
      : null,
  ].filter(Boolean) as Tab[];

  const [active, setActive] = useState(tabs[0]?.key);

  if (tabs.length === 0) return null;
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="rounded-sm border border-gold/20 bg-surface">
      <div className="flex flex-wrap border-b border-gold/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "px-5 py-3 font-cinzel text-xs uppercase tracking-widest transition-colors",
              t.key === current.key
                ? "border-b-2 border-gold text-gold"
                : "text-muted hover:text-gold",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="whitespace-pre-line p-6 text-sm leading-relaxed text-muted">
        {current.content}
      </p>
    </div>
  );
}
