"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { toggleDogFlag } from "@/app/admin/(panel)/dogs/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inputClass } from "@/lib/admin/styles";
import { dogPrimaryImage } from "@/lib/media";
import { humanize } from "@/lib/utils";
import type { DogWithMedia } from "@/types/app";

export function DogsTable({ dogs }: { dogs: DogWithMedia[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return dogs.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (category !== "all" && d.category !== category) return false;
      if (status !== "all" && d.status !== status) return false;
      return true;
    });
  }, [dogs, search, category, status]);

  const toggle = async (
    id: string,
    field: "is_public" | "is_featured",
    value: boolean,
  ) => {
    setBusy(id + field);
    await toggleDogFlag(id, field, value);
    router.refresh();
    setBusy(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputClass} max-w-[160px]`}
        >
          <option value="all">All categories</option>
          <option value="standard">Standard</option>
          <option value="elite">Elite</option>
          <option value="protection">Protection</option>
          <option value="breeding">Breeding</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} max-w-[160px]`}
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="in_training">In Training</option>
          <option value="not_available">Not Available</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-sm border border-gold/20">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
              <th className="p-3">Dog</th>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Public</th>
              <th className="p-3">Featured</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((dog) => {
              const image = dogPrimaryImage(dog.dog_media);
              return (
                <tr key={dog.id} className="border-b border-gold/5">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-sm bg-elevated">
                        {image ? (
                          <Image
                            src={image}
                            alt={dog.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="font-cinzel text-text">{dog.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted">{humanize(dog.category)}</td>
                  <td className="p-3">
                    <StatusBadge status={dog.status} />
                  </td>
                  <td className="p-3">
                    <Toggle
                      on={dog.is_public}
                      disabled={busy === dog.id + "is_public"}
                      onClick={() => toggle(dog.id, "is_public", !dog.is_public)}
                    />
                  </td>
                  <td className="p-3">
                    <Toggle
                      on={dog.is_featured}
                      disabled={busy === dog.id + "is_featured"}
                      onClick={() =>
                        toggle(dog.id, "is_featured", !dog.is_featured)
                      }
                    />
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/dogs/${dog.id}`}
                      className="font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-subtle">
                  No dogs match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        on
          ? "rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-300 disabled:opacity-50"
          : "rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-subtle disabled:opacity-50"
      }
    >
      {on ? "Yes" : "No"}
    </button>
  );
}
