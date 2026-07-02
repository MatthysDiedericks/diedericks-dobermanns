import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("waiting_list")
    .select("*, client:users(full_name, email, phone), list_type:waiting_list_types(name)")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();

  const { data: history } = await supabase
    .from("waiting_list_history")
    .select("*, changed_by_user:users!waiting_list_history_changed_by_fkey(full_name)")
    .eq("waiting_list_id", id)
    .order("created_at", { ascending: false });

  const client = entry.client as { full_name?: string; email?: string; phone?: string } | null;
  const listType = entry.list_type as { name?: string } | null;

  return (
    <div className="space-y-6">
      <Link href="/admin/waitlist" className="text-xs uppercase tracking-widest text-gold">
        ← Back
      </Link>
      <h1 className="font-cinzel text-2xl text-gold">{client?.full_name ?? entry.enquirer_name}</h1>
      <p className="text-sm text-subtle">{listType?.name} · {(entry.pipeline_stage ?? "enquiry").replace(/_/g, " ")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-gold/20 p-4">
          <h2 className="mb-2 text-xs uppercase tracking-widest text-gold">Contact</h2>
          <p>{client?.email ?? entry.enquirer_email}</p>
          <p>{client?.phone ?? entry.enquirer_phone}</p>
          <p>{entry.enquirer_country}</p>
        </section>
        <section className="rounded border border-gold/20 p-4">
          <h2 className="mb-2 text-xs uppercase tracking-widest text-gold">Preferences</h2>
          <p>{entry.preferred_category} · {entry.preferred_sex} · {entry.preferred_colour ?? "any"}</p>
          <p className="mt-2 text-sm text-muted">{entry.preference_notes}</p>
        </section>
      </div>

      <section className="rounded border border-gold/20 p-4">
        <h2 className="mb-3 text-xs uppercase tracking-widest text-gold">Stage history</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-subtle">No history yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history!.map((h) => (
              <li key={h.id} className="border-b border-gold/10 pb-2">
                {h.created_at?.slice(0, 10)} — {(h.from_stage ?? "—").replace(/_/g, " ")} → {h.to_stage.replace(/_/g, " ")}
                {(h.changed_by_user as { full_name?: string } | null)?.full_name ? (
                  <span className="text-subtle"> · by {(h.changed_by_user as { full_name: string }).full_name}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
