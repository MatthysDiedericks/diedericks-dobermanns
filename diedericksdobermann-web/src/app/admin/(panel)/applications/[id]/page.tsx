import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { ApplicationActions } from "@/components/admin/ApplicationActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cardClass } from "@/lib/admin/styles";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!app) notFound();

  const groups: { title: string; rows: [string, string | null][] }[] = [
    {
      title: "Personal",
      rows: [
        ["Full Name", app.full_name],
        ["Email", app.email],
        ["Phone", app.phone],
        ["ID Number", app.id_number],
        ["Address", app.address],
        ["City", app.city],
        ["Province", app.province],
        ["Country", app.country],
      ],
    },
    {
      title: "Home",
      rows: [
        ["Home Type", app.home_type],
        ["Secure Yard", app.has_secure_yard === null ? null : app.has_secure_yard ? "Yes" : "No"],
        ["Children's Ages", app.children_ages],
        ["Current Pets", app.current_pets],
      ],
    },
    {
      title: "Interest",
      rows: [
        ["Dog Interest", app.dog_interest],
        ["Purpose", app.purpose],
        ["Security Requirements", app.security_requirements],
        ["Experience", app.experience_with_dobermanns],
      ],
    },
    {
      title: "References",
      rows: [
        ["Vet Name", app.vet_name],
        ["Vet Phone", app.vet_phone],
        ["Reference Name", app.personal_reference_name],
        ["Reference Phone", app.personal_reference_phone],
      ],
    },
  ];

  return (
    <>
      <Link
        href="/admin/applications"
        className="font-cinzel text-xs uppercase tracking-widest text-muted hover:text-gold"
      >
        ← All Applications
      </Link>

      <div className="mt-3">
        <AdminHeader
          title={app.full_name}
          subtitle={`Submitted ${formatDate(app.created_at)}`}
        />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={app.status} />
        {app.agreed_to_terms ? (
          <span className="text-xs text-emerald-400">✓ Agreed to terms</span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {groups.map((g) => (
            <div key={g.title} className={`${cardClass} p-6`}>
              <h2 className="mb-4 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
                {g.title}
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {g.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-widest text-subtle">
                      {label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-muted">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className={`${cardClass} h-fit p-6`}>
          <h2 className="mb-4 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
            Review — {humanize(app.status)}
          </h2>
          <ApplicationActions
            id={app.id}
            status={app.status}
            notes={app.admin_notes}
          />
        </div>
      </div>
    </>
  );
}
