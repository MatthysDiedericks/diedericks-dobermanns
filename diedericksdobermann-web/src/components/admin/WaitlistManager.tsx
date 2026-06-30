"use client";

import { useRouter } from "next/navigation";

import { setWaitlistStatus } from "@/app/admin/(panel)/litters/actions";
import { inputClass } from "@/lib/admin/styles";

export type WaitlistRow = {
  id: string;
  position: number | null;
  preference_notes: string | null;
  status: string;
  client: { full_name: string | null } | null;
};

const STATUSES = ["active", "contacted", "confirmed", "cancelled"];

export function WaitlistManager({
  litterId,
  rows,
}: {
  litterId: string;
  rows: WaitlistRow[];
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="text-sm text-subtle">No one on the waiting list yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-gold/20">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
            <th className="p-3">#</th>
            <th className="p-3">Client</th>
            <th className="p-3">Preferences</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-gold/5">
              <td className="p-3 text-muted">{r.position ?? i + 1}</td>
              <td className="p-3 text-text">
                {r.client?.full_name ?? "Client"}
              </td>
              <td className="p-3 text-muted">{r.preference_notes ?? "—"}</td>
              <td className="p-3">
                <select
                  defaultValue={r.status}
                  onChange={async (e) => {
                    await setWaitlistStatus(r.id, litterId, e.target.value);
                    router.refresh();
                  }}
                  className={`${inputClass} max-w-[150px]`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
