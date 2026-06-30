"use client";

import { useState } from "react";

import { formatDate } from "@/lib/utils";
import type { Vaccination } from "@/types/app";

export function VaccinationTimeline({ items }: { items: Vaccination[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, 3);

  return (
    <div>
      <ol className="relative space-y-5 border-l border-gold/20 pl-6">
        {visible.map((v) => (
          <li key={v.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full bg-gold" />
            <p className="font-cinzel text-sm text-text">{v.vaccine_name}</p>
            <p className="text-xs text-muted">
              {formatDate(v.date_administered)}
              {v.next_due_date ? ` · next due ${formatDate(v.next_due_date)}` : ""}
            </p>
          </li>
        ))}
      </ol>
      {items.length > 3 ? (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light"
        >
          {expanded ? "Show less" : `View all (${items.length})`}
        </button>
      ) : null}
    </div>
  );
}
