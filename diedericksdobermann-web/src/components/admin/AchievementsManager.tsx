"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteAchievement,
  saveAchievement,
} from "@/app/admin/(panel)/dogs/actions";
import { ghostBtn, inputClass } from "@/lib/admin/styles";
import { formatDate } from "@/lib/utils";
import type { Achievement } from "@/types/app";

const empty = {
  title: "",
  score: "",
  trial_date: "",
  location: "",
  judge: "",
};

export function AchievementsManager({
  dogId,
  items,
}: {
  dogId: string;
  items: Achievement[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    await saveAchievement({
      dog_id: dogId,
      title: form.title,
      score: form.score || null,
      trial_date: form.trial_date || null,
      location: form.location || null,
      judge: form.judge || null,
    });
    setForm(empty);
    router.refresh();
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    await deleteAchievement(id, dogId);
    router.refresh();
    setBusy(false);
  };

  return (
    <div>
      <div className="space-y-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-gold/10 bg-background p-3"
          >
            <div>
              <p className="text-sm text-text">
                {a.title}
                {a.score ? (
                  <span className="ml-2 text-xs text-gold">{a.score}</span>
                ) : null}
              </p>
              <p className="text-xs text-subtle">
                {[formatDate(a.trial_date), a.location, a.judge]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => remove(a.id)}
              className="text-[10px] uppercase tracking-widest text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Title (e.g. IGP1)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="Score"
          value={form.score}
          onChange={(e) => setForm({ ...form, score: e.target.value })}
          className={inputClass}
        />
        <input
          type="date"
          value={form.trial_date}
          onChange={(e) => setForm({ ...form, trial_date: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="Judge"
          value={form.judge}
          onChange={(e) => setForm({ ...form, judge: e.target.value })}
          className={inputClass}
        />
      </div>
      <button onClick={add} disabled={busy} className={`${ghostBtn} mt-3`}>
        Add Achievement
      </button>
    </div>
  );
}
