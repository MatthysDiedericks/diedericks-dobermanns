"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteVaccination,
  saveVaccination,
} from "@/app/admin/(panel)/dogs/actions";
import { ghostBtn, inputClass } from "@/lib/admin/styles";
import { formatDate } from "@/lib/utils";
import type { Vaccination } from "@/types/app";

const empty = {
  vaccine_name: "",
  date_administered: "",
  next_due_date: "",
  administered_by: "",
  batch_number: "",
};

export function VaccinationsManager({
  dogId,
  items,
}: {
  dogId: string;
  items: Vaccination[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.vaccine_name.trim() || !form.date_administered) return;
    setBusy(true);
    await saveVaccination({
      dog_id: dogId,
      vaccine_name: form.vaccine_name,
      date_administered: form.date_administered,
      next_due_date: form.next_due_date || null,
      administered_by: form.administered_by || null,
      batch_number: form.batch_number || null,
    });
    setForm(empty);
    router.refresh();
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    await deleteVaccination(id, dogId);
    router.refresh();
    setBusy(false);
  };

  return (
    <div>
      <div className="space-y-2">
        {items.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-gold/10 bg-background p-3"
          >
            <div>
              <p className="text-sm text-text">{v.vaccine_name}</p>
              <p className="text-xs text-subtle">
                {formatDate(v.date_administered)}
                {v.next_due_date
                  ? ` · next due ${formatDate(v.next_due_date)}`
                  : ""}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => remove(v.id)}
              className="text-[10px] uppercase tracking-widest text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Vaccine name"
          value={form.vaccine_name}
          onChange={(e) => setForm({ ...form, vaccine_name: e.target.value })}
          className={inputClass}
        />
        <input
          type="date"
          value={form.date_administered}
          onChange={(e) =>
            setForm({ ...form, date_administered: e.target.value })
          }
          className={inputClass}
        />
        <input
          type="date"
          value={form.next_due_date}
          onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="Administered by"
          value={form.administered_by}
          onChange={(e) =>
            setForm({ ...form, administered_by: e.target.value })
          }
          className={inputClass}
        />
        <input
          placeholder="Batch number"
          value={form.batch_number}
          onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
          className={inputClass}
        />
      </div>
      <button onClick={add} disabled={busy} className={`${ghostBtn} mt-3`}>
        Add Vaccination
      </button>
    </div>
  );
}
