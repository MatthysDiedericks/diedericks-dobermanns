import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function scoreMatch(
  entry: {
    preferred_category?: string | null;
    preferred_sex?: string | null;
    preferred_colour?: string | null;
    payment_status?: string | null;
    priority?: string | null;
    created_at: string;
  },
  dog: { category?: string | null; sex?: string | null; colour?: string | null },
): number {
  let score = 0;
  const cat = entry.preferred_category ?? "any";
  const dogCat = dog.category === "puppy" ? "standard" : dog.category;
  if (cat === "any" || cat === dogCat) score += 40;
  if (!entry.preferred_sex || entry.preferred_sex === "any" || entry.preferred_sex === dog.sex) score += 20;
  const pref = entry.preferred_colour?.toLowerCase();
  if (!pref || pref === "any" || (dog.colour ?? "").toLowerCase().includes(pref)) score += 15;
  if (entry.payment_status === "deposit_paid" || entry.payment_status === "paid_in_full") score += 5;
  if (entry.priority === "high") score += 5;
  const weeks = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / (7 * 86_400_000));
  score += Math.min(Math.floor(weeks / 2), 20);
  return Math.min(score, 100);
}

export default async function AdminWaitlistMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ dogId?: string }>;
}) {
  const { dogId } = await searchParams;
  const supabase = await createClient();

  const [{ data: dogs }, { data: entries }] = await Promise.all([
    supabase.from("dogs").select("id, name, category, sex, colour").in("status", ["available", "reserved", "puppy"]).order("name"),
    supabase
      .from("waiting_list")
      .select("id, preferred_category, preferred_sex, preferred_colour, payment_status, priority, created_at, pipeline_stage, enquirer_name, client:users(full_name)")
      .in("pipeline_stage", ["deposit_paid", "matched", "reserved"])
      .neq("pipeline_stage", "do_not_sell"),
  ]);

  const dog = (dogs ?? []).find((d) => d.id === dogId) ?? dogs?.[0];
  const ranked = dog
    ? (entries ?? [])
        .map((e) => ({ entry: e, score: scoreMatch(e, dog) }))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/waitlist" className="text-xs uppercase tracking-widest text-gold">
        ← Back
      </Link>
      <h1 className="font-cinzel text-2xl text-gold">Preference Matching</h1>

      <div className="flex flex-wrap gap-2">
        {(dogs ?? []).map((d) => (
          <Link
            key={d.id}
            href={`/admin/waitlist/match?dogId=${d.id}`}
            className={`rounded border px-3 py-2 text-xs ${dog?.id === d.id ? "border-gold bg-gold/10 text-gold" : "border-gold/20"}`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      {dog ? (
        <p className="text-sm text-muted">Matching for <span className="text-gold">{dog.name}</span></p>
      ) : null}

      <div className="space-y-3">
        {ranked.map(({ entry, score }, i) => {
          const client = entry.client as { full_name?: string } | null;
          return (
            <div key={entry.id} className={`rounded border p-4 ${i === 0 ? "border-gold" : "border-gold/20"}`}>
              <div className="flex justify-between">
                <span className="text-gold">{client?.full_name ?? entry.enquirer_name}</span>
                <span>{score}%</span>
              </div>
              <div className="mt-2 h-2 rounded bg-surface">
                <div className="h-full rounded bg-gold" style={{ width: `${score}%` }} />
              </div>
              <Link href={`/admin/waitlist/${entry.id}`} className="mt-2 inline-block text-xs text-gold">
                View entry
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
