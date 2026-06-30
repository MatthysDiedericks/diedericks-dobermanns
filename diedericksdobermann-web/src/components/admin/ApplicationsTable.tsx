"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Application } from "@/types/app";

const TABS = ["all", "pending", "approved", "rejected", "waitlisted"];

export function ApplicationsTable({ apps }: { apps: Application[] }) {
  const [tab, setTab] = useState("all");

  const filtered = useMemo(
    () => apps.filter((a) => tab === "all" || a.status === tab),
    [apps, tab],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-sm border border-gold bg-gold/10 px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-gold"
                : "rounded-sm border border-border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-muted hover:text-gold"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-gold/20">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
              <th className="p-3">Applicant</th>
              <th className="p-3">Country</th>
              <th className="p-3">Interest</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-b border-gold/5 hover:bg-elevated"
              >
                <td className="p-3">
                  <Link
                    href={`/admin/applications/${a.id}`}
                    className="font-cinzel text-text hover:text-gold"
                  >
                    {a.full_name}
                  </Link>
                  <p className="text-xs text-subtle">{a.email}</p>
                </td>
                <td className="p-3 text-muted">{a.country}</td>
                <td className="p-3 text-muted">{a.dog_interest ?? "—"}</td>
                <td className="p-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="p-3 text-subtle">{formatDate(a.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-subtle">
                  No applications here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
