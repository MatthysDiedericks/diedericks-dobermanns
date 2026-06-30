"use client";

import { useState } from "react";

import { saveSettings } from "@/app/admin/(panel)/settings/actions";
import { inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import type { SettingsMap } from "@/lib/settings";

const GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: "Social Links",
    fields: [
      { key: "social_instagram", label: "Instagram URL" },
      { key: "social_facebook", label: "Facebook URL" },
      { key: "social_whatsapp", label: "WhatsApp Number" },
      { key: "whatsapp_community_url", label: "WhatsApp Community URL" },
      { key: "social_telegram", label: "Telegram URL" },
      { key: "social_youtube", label: "YouTube URL" },
    ],
  },
  {
    title: "App",
    fields: [
      { key: "app_store_url", label: "App Store URL" },
      { key: "play_store_url", label: "Play Store URL" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "contact_email", label: "Business Email" },
      { key: "contact_phone", label: "Phone" },
      { key: "contact_address", label: "Address" },
      { key: "maps_embed_url", label: "Google Maps Embed URL" },
    ],
  },
  {
    title: "Media",
    fields: [
      { key: "hero_image_url", label: "Hero Image URL" },
      { key: "logo_url", label: "Logo URL" },
    ],
  },
];

export function SettingsForm({ initial }: { initial: SettingsMap }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    GROUPS.forEach((g) =>
      g.fields.forEach((f) => {
        v[f.key] = initial[f.key] ?? "";
      }),
    );
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const entries = Object.entries(values).map(([key, value]) => ({
      key,
      value,
    }));
    const res = await saveSettings(entries);
    if (res.error) setError(res.error);
    else setSaved(true);
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {GROUPS.map((group) => (
        <div
          key={group.title}
          className="rounded-sm border border-gold/20 bg-surface p-6"
        >
          <h2 className="mb-5 font-cinzel text-lg uppercase tracking-widest text-gold-dim">
            {group.title}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {group.fields.map((f) => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <input
                  className={inputClass}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving} className={primaryBtn}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved ? <span className="text-sm text-emerald-400">Saved.</span> : null}
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
