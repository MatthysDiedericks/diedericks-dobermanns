"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteFaq,
  saveFaq,
  setFaqOrder,
  toggleFaqPublished,
} from "@/app/admin/(panel)/faq/actions";
import { inputClass, primaryBtn } from "@/lib/admin/styles";
import type { Faq } from "@/types/app";

const empty = { question: "", answer: "", category: "" };

export function FaqManager({ items }: { items: Faq[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const refresh = () => router.refresh();

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    await setFaqOrder(next.map((f) => f.id));
    refresh();
  };

  const add = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setBusy(true);
    await saveFaq({
      question: form.question,
      answer: form.answer,
      category: form.category || null,
      is_published: true,
      sort_order: order.length,
    });
    setForm(empty);
    refresh();
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await deleteFaq(id);
    refresh();
  };

  return (
    <div>
      <div className="space-y-3">
        {order.map((f, i) => (
          <div
            key={f.id}
            className="rounded-sm border border-gold/20 bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-cinzel text-text">{f.question}</p>
                {f.category ? (
                  <span className="text-[10px] uppercase tracking-widest text-gold-dim">
                    {f.category}
                  </span>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-sm text-muted">
                  {f.answer}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => move(i, -1)}
                    className="px-2 text-gold"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    className="px-2 text-gold"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await toggleFaqPublished(f.id, !f.is_published);
                  refresh();
                }}
                className={
                  f.is_published
                    ? "rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-300"
                    : "rounded-sm border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-subtle"
                }
              >
                {f.is_published ? "Published" : "Hidden"}
              </button>
              <button
                onClick={() => remove(f.id)}
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
          Add Question
        </p>
        <input
          placeholder="Question"
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="Category (optional)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={`${inputClass} mt-3`}
        />
        <textarea
          placeholder="Answer"
          rows={3}
          value={form.answer}
          onChange={(e) => setForm({ ...form, answer: e.target.value })}
          className={`${inputClass} mt-3`}
        />
        <button onClick={add} disabled={busy} className={`${primaryBtn} mt-3`}>
          Add
        </button>
      </div>
    </div>
  );
}
