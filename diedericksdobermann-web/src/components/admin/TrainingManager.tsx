"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  assignTrainer,
  createAvailability,
  deleteAvailability,
  saveSessionType,
  setBookingStatus,
  toggleSessionType,
} from "@/app/admin/(panel)/training/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ghostBtn, inputClass, primaryBtn } from "@/lib/admin/styles";
import { formatDate, formatPrice, humanize } from "@/lib/utils";
import type { TrainingSessionType } from "@/types/app";

export type BookingRow = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_format: string;
  status: string;
  client_notes: string | null;
  trainer_notes: string | null;
  trainer_id: string | null;
  video_room_url: string | null;
  client: { full_name: string | null } | null;
  session_type: { name: string } | null;
  trainer: { full_name: string | null } | null;
};

export type AvailabilityRow = {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  session_type: { name: string } | null;
};

type Trainer = { id: string; full_name: string | null };

const TABS = ["Requests", "Calendar", "Session Types", "Availability"];

export function TrainingManager({
  bookings,
  sessionTypes,
  availability,
  trainers,
}: {
  bookings: BookingRow[];
  sessionTypes: TrainingSessionType[];
  availability: AvailabilityRow[];
  trainers: Trainer[];
}) {
  const [tab, setTab] = useState("Requests");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
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

      {tab === "Requests" ? (
        <Requests bookings={bookings} trainers={trainers} />
      ) : null}
      {tab === "Calendar" ? <Calendar bookings={bookings} /> : null}
      {tab === "Session Types" ? (
        <SessionTypes items={sessionTypes} />
      ) : null}
      {tab === "Availability" ? (
        <Availability items={availability} sessionTypes={sessionTypes} />
      ) : null}
    </div>
  );
}

function Requests({
  bookings,
  trainers,
}: {
  bookings: BookingRow[];
  trainers: Trainer[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () => bookings.filter((b) => filter === "all" || b.status === filter),
    [bookings, filter],
  );

  const act = async (fn: () => Promise<void>, id: string) => {
    setBusy(id);
    await fn();
    router.refresh();
    setBusy(null);
  };

  const createRoom = async (id: string) => {
    setBusy(id);
    await fetch("/api/admin/create-video-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id }),
    });
    router.refresh();
    setBusy(null);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "rounded-sm border border-gold bg-gold/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-gold"
                : "rounded-sm border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted"
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="rounded-sm border border-gold/20 bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-cinzel text-text">
                  {b.client?.full_name ?? "Client"} ·{" "}
                  {b.session_type?.name ?? "Session"}
                </p>
                <p className="text-xs text-subtle">
                  {formatDate(b.scheduled_at)} ·{" "}
                  {new Date(b.scheduled_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {humanize(b.session_format)} · {b.duration_minutes}m
                </p>
                {b.client_notes ? (
                  <p className="mt-2 text-sm text-muted">{b.client_notes}</p>
                ) : null}
              </div>
              <StatusBadge status={b.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {b.status === "pending" ? (
                <button
                  disabled={busy === b.id}
                  onClick={() =>
                    act(() => setBookingStatus(b.id, "confirmed"), b.id)
                  }
                  className={ghostBtn}
                >
                  Confirm
                </button>
              ) : null}
              {b.status !== "completed" && b.status !== "cancelled" ? (
                <>
                  <button
                    disabled={busy === b.id}
                    onClick={() =>
                      act(() => setBookingStatus(b.id, "completed"), b.id)
                    }
                    className={ghostBtn}
                  >
                    Complete
                  </button>
                  <button
                    disabled={busy === b.id}
                    onClick={() =>
                      act(() => setBookingStatus(b.id, "cancelled"), b.id)
                    }
                    className={ghostBtn}
                  >
                    Cancel
                  </button>
                </>
              ) : null}
              {b.session_format !== "in_person" && !b.video_room_url ? (
                <button
                  disabled={busy === b.id}
                  onClick={() => createRoom(b.id)}
                  className={ghostBtn}
                >
                  Create Video Room
                </button>
              ) : null}
              {b.video_room_url ? (
                <a
                  href={b.video_room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ghostBtn}
                >
                  Open Room
                </a>
              ) : null}

              <select
                defaultValue={b.trainer_id ?? ""}
                onChange={(e) =>
                  act(() => assignTrainer(b.id, e.target.value), b.id)
                }
                className={`${inputClass} ml-auto max-w-[180px]`}
              >
                <option value="">Assign trainer…</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name ?? "Trainer"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-subtle">No bookings here.</p>
        ) : null}
      </div>
    </div>
  );
}

function Calendar({ bookings }: { bookings: BookingRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    [...bookings]
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .forEach((b) => {
        const key = b.scheduled_at.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
      });
    return [...map.entries()];
  }, [bookings]);

  if (groups.length === 0) {
    return <p className="py-8 text-center text-subtle">No bookings scheduled.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map(([date, rows]) => (
        <div key={date}>
          <p className="mb-2 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
            {formatDate(date)}
          </p>
          <div className="space-y-2">
            {rows.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-gold/10 bg-surface p-3"
              >
                <span className="text-sm text-text">
                  {new Date(b.scheduled_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {b.client?.full_name ?? "Client"}
                </span>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionTypes({ items }: { items: TrainingSessionType[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [format, setFormat] = useState("in_person");

  const add = async () => {
    if (!name.trim()) return;
    await saveSessionType({
      name,
      price: price ? Number(price) : null,
      duration_minutes: Number(duration) || 60,
      session_format: format,
      is_active: true,
    });
    setName("");
    setPrice("");
    router.refresh();
  };

  return (
    <div>
      <div className="space-y-3">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-gold/20 bg-surface p-4"
          >
            <div>
              <p className="font-cinzel text-text">{s.name}</p>
              <p className="text-xs text-subtle">
                {humanize(s.session_format)} · {s.duration_minutes}m ·{" "}
                {formatPrice(s.price, s.currency) ?? "No price"}
              </p>
            </div>
            <button
              onClick={async () => {
                await toggleSessionType(s.id, !s.is_active);
                router.refresh();
              }}
              className={
                s.is_active
                  ? "rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-300"
                  : "rounded-sm border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-subtle"
              }
            >
              {s.is_active ? "Active" : "Hidden"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-sm border border-gold/20 bg-surface p-5">
        <p className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Add Session Type
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Minutes"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
          />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={inputClass}
          >
            <option value="in_person">In person</option>
            <option value="video_call">Video call</option>
            <option value="both">Both</option>
          </select>
        </div>
        <button onClick={add} className={`${primaryBtn} mt-3`}>
          Add
        </button>
      </div>
    </div>
  );
}

function Availability({
  items,
  sessionTypes,
}: {
  items: AvailabilityRow[];
  sessionTypes: TrainingSessionType[];
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [sessionTypeId, setSessionTypeId] = useState("");
  const [max, setMax] = useState("1");

  const add = async () => {
    if (!date) return;
    await createAvailability({
      available_date: date,
      start_time: start,
      end_time: end,
      session_type_id: sessionTypeId || null,
      max_bookings: Number(max) || 1,
    });
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 rounded-sm border border-gold/20 bg-surface p-5">
        <p className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Add Availability
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
          <select
            value={sessionTypeId}
            onChange={(e) => setSessionTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Any session</option>
            {sessionTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={inputClass}
          />
        </div>
        <button onClick={add} className={`${primaryBtn} mt-3`}>
          Add Slot
        </button>
      </div>

      <div className="space-y-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-gold/10 bg-surface p-3"
          >
            <span className="text-sm text-text">
              {formatDate(a.available_date)} · {a.start_time}–{a.end_time}
              {a.session_type ? ` · ${a.session_type.name}` : ""} · max{" "}
              {a.max_bookings}
            </span>
            <button
              onClick={async () => {
                await deleteAvailability(a.id);
                router.refresh();
              }}
              className="text-[10px] uppercase tracking-widest text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="py-6 text-center text-subtle">No availability slots.</p>
        ) : null}
      </div>
    </div>
  );
}
