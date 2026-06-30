"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types/app";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % items.length),
      6000,
    );
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div>
      {/* Desktop grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-2">
        {items.map((t) => (
          <TestimonialCard key={t.id} item={t} />
        ))}
      </div>

      {/* Mobile carousel */}
      <div className="md:hidden">
        <TestimonialCard item={items[active]} />
        {items.length > 1 ? (
          <div className="mt-6 flex justify-center gap-2">
            {items.map((t, i) => (
              <button
                key={t.id}
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-6 bg-gold" : "w-1.5 bg-subtle",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-sm border border-gold/20 bg-surface p-8">
      <span className="font-cinzel text-5xl leading-none text-gold/50">“</span>
      <blockquote className="-mt-3 flex-1 text-text/90 leading-relaxed">
        {item.content}
      </blockquote>
      <figcaption className="mt-6 border-t border-gold/10 pt-4">
        <p className="font-cinzel text-gold">{item.client_name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          {item.location ? <span>{item.location}</span> : null}
          {item.dog_name ? (
            <span className="rounded-sm border border-gold/20 px-2 py-0.5 text-gold-dim">
              {item.dog_name}
            </span>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
