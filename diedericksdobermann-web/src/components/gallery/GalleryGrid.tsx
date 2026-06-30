"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/app";

type Filter = "all" | "photos" | "videos";

const PAGE_SIZE = 20;

function youTubeEmbed(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [count, setCount] = useState(PAGE_SIZE);
  const [active, setActive] = useState<GalleryItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === "photos") return !it.video_url;
      if (filter === "videos") return !!it.video_url;
      return true;
    });
  }, [items, filter]);

  const visible = filtered.slice(0, count);

  return (
    <div>
      <div className="flex justify-center gap-2">
        {(["all", "photos", "videos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setCount(PAGE_SIZE);
            }}
            className={cn(
              "rounded-sm border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest transition-colors",
              filter === f
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold/40 hover:text-gold",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {visible.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="group relative block w-full overflow-hidden rounded-sm border border-gold/20 break-inside-avoid"
            >
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.title ?? "Gallery image"}
                  width={600}
                  height={800}
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-elevated">
                  <span className="font-cinzel text-sm uppercase tracking-widest text-gold">
                    ▶ Video
                  </span>
                </div>
              )}
              {item.title ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-3 text-left font-cinzel text-sm text-text">
                  {item.title}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center font-cinzel text-sm uppercase tracking-widest text-subtle">
          Nothing to show here yet.
        </p>
      )}

      {count < filtered.length ? (
        <div className="mt-10 text-center">
          <button
            onClick={() => setCount((c) => c + PAGE_SIZE)}
            className="rounded-sm border border-gold px-6 py-3 font-cinzel text-xs uppercase tracking-widest text-gold hover:bg-gold/10"
          >
            Load More
          </button>
        </div>
      ) : null}

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-sm border border-gold/30 bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActive(null)}
              aria-label="Close"
              className="absolute right-3 top-2 z-10 text-3xl leading-none text-text/80 hover:text-gold"
            >
              ×
            </button>
            {active.video_url ? (
              youTubeEmbed(active.video_url) ? (
                <iframe
                  src={youTubeEmbed(active.video_url)!}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={active.video_url} controls className="w-full" />
              )
            ) : active.image_url ? (
              <Image
                src={active.image_url}
                alt={active.title ?? "Gallery image"}
                width={1200}
                height={900}
                className="h-auto max-h-[80vh] w-full object-contain"
              />
            ) : null}
            {active.title || active.description ? (
              <div className="p-5">
                {active.title ? (
                  <p className="font-cinzel text-lg text-gold">
                    {active.title}
                  </p>
                ) : null}
                {active.description ? (
                  <p className="mt-1 text-sm text-muted">{active.description}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
