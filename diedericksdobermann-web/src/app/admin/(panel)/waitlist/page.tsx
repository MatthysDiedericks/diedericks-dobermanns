import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("waiting_list")
    .select("id, pipeline_stage, enquirer_name, preference_notes, payment_status, created_at, client:users(full_name, email, phone)")
    .order("created_at", { ascending: false });

  const { data: types } = await supabase
    .from("waiting_list_types")
    .select("id, name, slug, colour")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-cinzel text-2xl tracking-widest text-gold">Waiting List</h1>
        <div className="flex gap-2">
          <Link href="/admin/waitlist/match" className="rounded border border-gold/30 px-3 py-2 text-xs uppercase tracking-widest text-gold">
            Match
          </Link>
          <Link href="/admin/waitlist/follow-ups" className="rounded border border-gold/30 px-3 py-2 text-xs uppercase tracking-widest text-gold">
            Follow-ups
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(types ?? []).map((t) => (
          <span
            key={t.id}
            className={`rounded-full border px-3 py-1 text-xs ${t.slug === "do-not-sell" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-gold/20 text-muted"}`}
          >
            {t.name}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-gold/20">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gold/20 bg-surface text-left text-xs uppercase tracking-widest text-subtle">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((row) => {
              const client = row.client as { full_name?: string; email?: string } | null;
              const name = client?.full_name ?? row.enquirer_name ?? "—";
              return (
                <tr key={row.id} className="border-b border-gold/10">
                  <td className="px-4 py-3">
                    <Link href={`/admin/waitlist/${row.id}`} className="text-gold hover:underline">
                      {name}
                    </Link>
                    <div className="text-xs text-subtle">{client?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{(row.pipeline_stage ?? "enquiry").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize">{(row.payment_status ?? "not_paid").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{row.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/waitlist/${row.id}`} className="text-xs text-gold">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
