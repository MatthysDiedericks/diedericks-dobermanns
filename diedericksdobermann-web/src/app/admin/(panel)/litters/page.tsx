import Link from "next/link";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { LitterWithParents } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminLittersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("litters")
    .select(
      "*, mother:dogs!litters_mother_id_fkey(id,name), father:dogs!litters_father_id_fkey(id,name)",
    )
    .order("expected_date", { ascending: false });

  const litters = (data ?? []) as unknown as LitterWithParents[];

  return (
    <>
      <AdminHeader
        title="Litters"
        subtitle={`${litters.length} total`}
        action={{ href: "/admin/litters/new", label: "Add Litter" }}
      />

      <div className="overflow-x-auto rounded-sm border border-gold/20">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
              <th className="p-3">Litter</th>
              <th className="p-3">Pairing</th>
              <th className="p-3">Expected</th>
              <th className="p-3">Status</th>
              <th className="p-3">Available</th>
              <th className="p-3">Public</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {litters.map((l) => (
              <tr key={l.id} className="border-b border-gold/5">
                <td className="p-3 font-cinzel text-text">
                  {l.name ?? "Litter"}
                </td>
                <td className="p-3 text-muted">
                  {l.father?.name && l.mother?.name
                    ? `${l.father.name} × ${l.mother.name}`
                    : "—"}
                </td>
                <td className="p-3 text-muted">{formatDate(l.expected_date)}</td>
                <td className="p-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="p-3 text-muted">
                  {l.available_count ?? "—"}
                  {l.puppy_count ? ` / ${l.puppy_count}` : ""}
                </td>
                <td className="p-3 text-muted">{l.is_public ? "Yes" : "No"}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/litters/${l.id}`}
                    className="font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {litters.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-subtle">
                  No litters yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
