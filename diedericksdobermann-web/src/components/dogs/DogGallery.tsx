"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { DogMedia } from "@/types/app";

export function DogGallery({
  media,
  name,
}: {
  media: DogMedia[];
  name: string;
}) {
  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const [activeId, setActiveId] = useState(
    sorted.find((m) => m.is_primary)?.id ?? sorted[0]?.id,
  );
  const active = sorted.find((m) => m.id === activeId) ?? sorted[0];

  if (!active) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-sm border border-gold/20 bg-elevated">
        <span className="font-cinzel text-6xl text-gold/20">DD</span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-sm border border-gold/20 bg-elevated">
        {active.type === "video" ? (
          <video
            key={active.id}
            src={active.url}
            controls
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={active.url}
            alt={active.caption ?? name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        )}
      </div>

      {sorted.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {sorted.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-sm border transition-colors",
                m.id === activeId
                  ? "border-gold"
                  : "border-border hover:border-gold/50",
              )}
            >
              <Image
                src={m.thumbnail_url ?? m.url}
                alt={m.caption ?? name}
                fill
                sizes="20vw"
                className="object-cover"
              />
              {m.type === "video" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <span className="font-cinzel text-[10px] uppercase tracking-widest text-gold">
                    Play
                  </span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
