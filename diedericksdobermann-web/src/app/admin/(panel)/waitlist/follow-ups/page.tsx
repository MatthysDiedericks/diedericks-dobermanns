import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistFollowUpsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("waiting_list")
    .select("id, follow_up_date, pipeline_stage, enquirer_name, client:users(full_name)")
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", weekEnd)
    .order("follow_up_date");

  const overdue = (entries ?? []).filter((e) => e.follow_up_date! < today);
  const dueToday = (entries ?? []).filter((e) => e.follow_up_date === today);
  const thisWeek = (entries ?? []).filter((e) => e.follow_up_date! > today);

  function Row({ title, rows }: { title: string; rows: typeof entries }) {
    if (!rows?.length) return null;
    return (
      <section className="mb-8">
        <h2 className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold">{title}</h2>
        <ul className="space-y-2">
          {rows.map((e) => {
            const client = e.client as { full_name?: string } | null;
            return (
              <li key={e.id} className="flex items-center justify-between rounded border border-gold/20 px-4 py-3">
                <span>{client?.full_name ?? e.enquirer_name}</span>
                <Link href={`/admin/waitlist/${e.id}`} className="text-xs text-gold">
                  {e.follow_up_date}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div>
      <Link href="/admin/waitlist" className="text-xs uppercase tracking-widest text-gold">
        ← Back
      </Link>
      <h1 className="mt-4 font-cinzel text-2xl text-gold">Follow-ups</h1>
      <Row title="Overdue" rows={overdue} />
      <Row title="Due today" rows={dueToday} />
      <Row title="This week" rows={thisWeek} />
    </div>
  );
}
