"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { sendBroadcast } from "@/app/admin/(panel)/messaging/actions";
import { ImageUploader, type UploadedFile } from "@/components/ui/ImageUploader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import { formatDate } from "@/lib/utils";
import type { BroadcastMessage, ClientGroup } from "@/types/app";

const CHANNELS = [
  { key: "push", label: "Push Notification" },
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
];

type HistoryRow = BroadcastMessage & { group: { name: string } | null };

export function MessagingComposer({
  groups,
  history,
}: {
  groups: ClientGroup[];
  history: HistoryRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"compose" | "history">("compose");

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>(["push"]);
  const [schedule, setSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (key: string) =>
    setChannels((c) =>
      c.includes(key) ? c.filter((x) => x !== key) : [...c, key],
    );

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await sendBroadcast({
      group_id: groupId || null,
      title,
      body,
      image_url: imageUrl,
      channels,
      scheduled_for: schedule && scheduledFor ? scheduledFor : null,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setTitle("");
    setBody("");
    setImageUrl(null);
    router.refresh();
  };

  const onUploaded = async (file: UploadedFile) => setImageUrl(file.url);

  const targetName =
    groups.find((g) => g.id === groupId)?.name ?? "All Clients";

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(["compose", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-sm border border-gold bg-gold/10 px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-gold"
                : "rounded-sm border border-border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-muted"
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-sm border border-gold/20 bg-surface p-6">
            <div>
              <label className={labelClass}>Target</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={inputClass}
              >
                <option value="">All Clients</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Message ({body.length}/500)
              </label>
              <textarea
                rows={5}
                maxLength={500}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Image (optional)</label>
              <ImageUploader
                bucket="broadcasts"
                pathPrefix="broadcasts"
                accept="image/*"
                onUploaded={onUploaded}
              />
            </div>
            <div>
              <label className={labelClass}>Channels</label>
              <div className="flex flex-wrap gap-4">
                {CHANNELS.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 text-sm text-muted"
                  >
                    <input
                      type="checkbox"
                      checked={channels.includes(c.key)}
                      onChange={() => toggleChannel(c.key)}
                      className="h-4 w-4 accent-[#c4a35a]"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={schedule}
                  onChange={(e) => setSchedule(e.target.checked)}
                  className="h-4 w-4 accent-[#c4a35a]"
                />
                Schedule for later
              </label>
              {schedule ? (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className={`${inputClass} mt-2`}
                />
              ) : null}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {done ? (
              <p className="text-sm text-emerald-400">
                Broadcast {schedule ? "scheduled" : "sent"}.
              </p>
            ) : null}

            <button onClick={send} disabled={busy} className={primaryBtn}>
              {busy ? "Sending…" : schedule ? "Schedule" : "Send Now"}
            </button>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
              Preview — {targetName}
            </p>
            <div className="rounded-sm border border-gold/20 bg-elevated p-5">
              {imageUrl ? (
                <div className="relative mb-4 aspect-video overflow-hidden rounded-sm">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <p className="font-cinzel text-lg text-gold">
                {title || "Message title"}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">
                {body || "Your message will appear here."}
              </p>
              <div className="mt-4 flex gap-2">
                {(channels.length ? channels : ["push"]).map((c) => (
                  <span
                    key={c}
                    className="rounded-sm border border-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold-dim"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-gold/20">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
                <th className="p-3">Title</th>
                <th className="p-3">Group</th>
                <th className="p-3">Channels</th>
                <th className="p-3">Sent</th>
                <th className="p-3">Recipients</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-gold/5">
                  <td className="p-3 text-text">{h.title}</td>
                  <td className="p-3 text-muted">
                    {h.group?.name ?? "All Clients"}
                  </td>
                  <td className="p-3 text-muted">{h.channels.join(", ")}</td>
                  <td className="p-3 text-subtle">
                    {formatDate(h.sent_at ?? h.scheduled_for)}
                  </td>
                  <td className="p-3 text-muted">{h.recipient_count ?? 0}</td>
                  <td className="p-3">
                    <StatusBadge status={h.status} />
                  </td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-subtle">
                    No broadcasts sent yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
