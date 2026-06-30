"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addDogMedia,
  deleteDogMedia,
  setPrimaryMedia,
} from "@/app/admin/(panel)/dogs/actions";
import { ImageUploader, type UploadedFile } from "@/components/ui/ImageUploader";
import type { DogMedia } from "@/types/app";

export function MediaManager({
  dogId,
  media,
}: {
  dogId: string;
  media: DogMedia[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onUploaded = async (file: UploadedFile) => {
    await addDogMedia({
      dog_id: dogId,
      url: file.url,
      type: file.type,
      is_primary: media.length === 0,
      sort_order: media.length,
    });
    router.refresh();
  };

  const remove = async (m: DogMedia) => {
    setBusy(true);
    const path = m.url.split("/dog-media/")[1];
    await deleteDogMedia(m.id, dogId, path);
    router.refresh();
    setBusy(false);
  };

  const makePrimary = async (m: DogMedia) => {
    setBusy(true);
    await setPrimaryMedia(m.id, dogId);
    router.refresh();
    setBusy(false);
  };

  return (
    <div>
      <ImageUploader
        bucket="dog-media"
        pathPrefix={`dogs/${dogId}`}
        onUploaded={onUploaded}
        label="Upload photos or videos"
      />

      {media.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...media]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-sm border border-gold/20 bg-elevated"
              >
                <div className="relative aspect-square">
                  {m.type === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" />
                  ) : (
                    <Image
                      src={m.url}
                      alt={m.caption ?? "Dog media"}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  )}
                  {m.is_primary ? (
                    <span className="absolute left-2 top-2 rounded-sm bg-gold px-2 py-0.5 text-[10px] uppercase tracking-widest text-background">
                      Primary
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <button
                    disabled={busy || m.is_primary}
                    onClick={() => makePrimary(m)}
                    className="text-[10px] uppercase tracking-widest text-gold disabled:opacity-40"
                  >
                    Set primary
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => remove(m)}
                    className="text-[10px] uppercase tracking-widest text-red-300 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-subtle">No media uploaded yet.</p>
      )}
    </div>
  );
}
