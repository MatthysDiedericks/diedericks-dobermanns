"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteTestimonial,
  saveTestimonial,
  toggleTestimonial,
} from "@/app/admin/(panel)/testimonials/actions";
import { inputClass, primaryBtn } from "@/lib/admin/styles";
import type { Testimonial } from "@/types/app";

const empty = {
  client_name: "",
  content: "",
  dog_name: "",
  location: "",
};

export function TestimonialsManager({ items }: { items: Testimonial[] }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const refresh = () => router.refresh();

  const add = async () => {
    if (!form.client_name.trim() || !form.content.trim()) return;
    setBusy(true);
    await saveTestimonial({
      client_name: form.client_name,
      content: form.content,
      dog_name: form.dog_name || null,
      location: form.location || null,
      is_approved: true,
    });
    setForm(empty);
    refresh();
    setBusy(false);
  };

  const toggle = async (
    id: string,
    field: "is_approved" | "is_featured",
    value: boolean,
  ) => {
    await toggleTestimonial(id, field, value);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    await deleteTestimonial(id);
    refresh();
  };

  return (
    <div>
      <div className="space-y-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-sm border border-gold/20 bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-cinzel text-text">
                  {t.client_name}
                  {t.dog_name ? (
                    <span className="ml-2 text-xs text-gold-dim">
                      {t.dog_name}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted">{t.content}</p>
                {t.location ? (
                  <p className="mt-1 text-xs text-subtle">{t.location}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill
                on={t.is_approved}
                label="Approved"
                onClick={() => toggle(t.id, "is_approved", !t.is_approved)}
              />
              <Pill
                on={t.is_featured}
                label="Featured"
                onClick={() => toggle(t.id, "is_featured", !t.is_featured)}
              />
              <button
                onClick={() => remove(t.id)}
                className="text-[10px] uppercase tracking-widest text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-sm border border-gold/20 bg-surface p-5">
        <p className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Add Testimonial
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Client name"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Dog name (optional)"
            value={form.dog_name}
            onChange={(e) => setForm({ ...form, dog_name: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className={inputClass}
          />
        </div>
        <textarea
          placeholder="Testimonial content"
          rows={3}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className={`${inputClass} mt-3`}
        />
        <button onClick={add} disabled={busy} className={`${primaryBtn} mt-3`}>
          Add
        </button>
      </div>
    </div>
  );
}

function Pill({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        on
          ? "rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-300"
          : "rounded-sm border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-subtle"
      }
    >
      {label}
    </button>
  );
}
