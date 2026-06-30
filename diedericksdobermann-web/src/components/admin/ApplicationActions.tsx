"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateApplication } from "@/app/admin/(panel)/applications/actions";
import { ghostBtn, inputClass, primaryBtn } from "@/lib/admin/styles";

const STATUSES = [
  { key: "approved", label: "Approve" },
  { key: "waitlisted", label: "Waitlist" },
  { key: "rejected", label: "Reject" },
  { key: "pending", label: "Reset to Pending" },
];

export function ApplicationActions({
  id,
  status,
  notes,
}: {
  id: string;
  status: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const setStatus = async (next: string) => {
    setBusy(true);
    await updateApplication(id, { status: next });
    router.refresh();
    setBusy(false);
  };

  const saveNotes = async () => {
    setBusy(true);
    await updateApplication(id, { admin_notes: value });
    router.refresh();
    setSaved(true);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-cinzel text-[11px] uppercase tracking-widest text-muted">
          Set Status — currently {status}
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              disabled={busy || status === s.key}
              className={ghostBtn}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-cinzel text-[11px] uppercase tracking-widest text-muted">
          Admin Notes
        </p>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className={inputClass}
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={saveNotes} disabled={busy} className={primaryBtn}>
            Save Notes
          </button>
          {saved ? (
            <span className="text-sm text-emerald-400">Saved.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
