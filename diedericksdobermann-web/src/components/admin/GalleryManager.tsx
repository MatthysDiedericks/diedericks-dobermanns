"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addGalleryItem,
  deleteGalleryItem,
  setGalleryOrder,
  toggleGalleryFeatured,
} from "@/app/admin/(panel)/gallery/actions";
import { ImageUploader, type UploadedFile } from "@/components/ui/ImageUploader";
import { inputClass } from "@/lib/admin/styles";
import type { GalleryItem } from "@/types/app";

const CATEGORIES = ["dogs", "training", "events", "achievements"];

export function GalleryManager({ items }: { items: GalleryItem[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("dogs");
  const [description, setDescription] = useState("");

  const refresh = () => router.refresh();

  const onUploaded = async (file: UploadedFile) => {
    await addGalleryItem({
      title: title || null,
      category,
      description: description || null,
      image_url: file.type === "image" ? file.url : null,
      video_url: file.type === "video" ? file.url : null,
      sort_order: order.length,
    });
    setTitle("");
    setDescription("");
    refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    await setGalleryOrder(next.map((g) => g.id));
    refresh();
  };

  return (
    <div>
      <div className="mb-6 rounded-sm border border-gold/20 bg-surface p-5">
        <p className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Add Media
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mt-4">
          <ImageUploader
            bucket="gallery"
            pathPrefix="gallery"
            onUploaded={onUploaded}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {order.map((item, i) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-sm border border-gold/20 bg-surface"
          >
            <div className="relative aspect-square bg-elevated">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.title ?? "Gallery"}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-cinzel text-xs uppercase tracking-widest text-gold">
                    Video
                  </span>
                </div>
              )}
            </div>
            <div className="p-2">
              {item.title ? (
                <p className="truncate text-xs text-text">{item.title}</p>
              ) : null}
              <div className="mt-1 flex items-center justify-between">
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} className="px-1 text-gold">
                    ↑
                  </button>
                  <button onClick={() => move(i, 1)} className="px-1 text-gold">
                    ↓
                  </button>
                </div>
                <button
                  onClick={async () => {
                    await toggleGalleryFeatured(item.id, !item.is_featured);
                    refresh();
                  }}
                  className={
                    item.is_featured
                      ? "text-[10px] uppercase tracking-widest text-gold"
                      : "text-[10px] uppercase tracking-widest text-subtle"
                  }
                >
                  ★
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this item?")) return;
                    await deleteGalleryItem(item.id, item.image_url);
                    refresh();
                  }}
                  className="text-[10px] uppercase tracking-widest text-red-300"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {order.length === 0 ? (
        <p className="py-8 text-center text-subtle">No gallery items yet.</p>
      ) : null}
    </div>
  );
}
