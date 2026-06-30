"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  replyEnquiry,
  setEnquiryStatus,
} from "@/app/admin/(panel)/enquiries/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ghostBtn, inputClass, primaryBtn } from "@/lib/admin/styles";
import { formatDate } from "@/lib/utils";
import type { Enquiry } from "@/types/app";

const TABS = ["new", "replied", "archived", "all"];

export function EnquiriesManager({ enquiries }: { enquiries: Enquiry[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("new");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => enquiries.filter((e) => tab === "all" || e.status === tab),
    [enquiries, tab],
  );

  const open = (e: Enquiry) => {
    setOpenId(e.id);
    setReply(e.admin_notes ?? "");
  };

  const sendReply = async (id: string) => {
    setBusy(true);
    await replyEnquiry(id, reply);
    router.refresh();
    setBusy(false);
    setOpenId(null);
  };

  const archive = async (id: string) => {
    setBusy(true);
    await setEnquiryStatus(id, "archived");
    router.refresh();
    setBusy(false);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-sm border border-gold bg-gold/10 px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-gold"
                : "rounded-sm border border-border px-4 py-2 font-cinzel text-[11px] uppercase tracking-widest text-muted hover:text-gold"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="rounded-sm border border-gold/20 bg-surface p-4"
          >
            <button
              onClick={() => (openId === e.id ? setOpenId(null) : open(e))}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="font-cinzel text-text">{e.full_name}</p>
                <p className="text-xs text-subtle">
                  {e.subject ?? "General"} · {e.email} · {formatDate(e.created_at)}
                </p>
              </div>
              <StatusBadge status={e.status} />
            </button>

            {openId === e.id ? (
              <div className="mt-4 border-t border-gold/10 pt-4">
                <p className="whitespace-pre-line text-sm text-muted">
                  {e.message}
                </p>
                <label className="mt-4 block font-cinzel text-[11px] uppercase tracking-widest text-muted">
                  Reply / Notes
                </label>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(ev) => setReply(ev.target.value)}
                  className={`${inputClass} mt-1`}
                />
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => sendReply(e.id)}
                    disabled={busy}
                    className={primaryBtn}
                  >
                    Mark Replied
                  </button>
                  <button
                    onClick={() => archive(e.id)}
                    disabled={busy}
                    className={ghostBtn}
                  >
                    Archive
                  </button>
                  {e.phone ? (
                    <a
                      href={`tel:${e.phone}`}
                      className={ghostBtn}
                    >
                      Call
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-subtle">No enquiries here.</p>
        ) : null}
      </div>
    </div>
  );
}
