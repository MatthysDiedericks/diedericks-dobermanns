"use client";

import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  url: string;
  storagePath: string;
  type: "image" | "video";
};

const MAX_BYTES = 50 * 1024 * 1024;

export function ImageUploader({
  bucket,
  pathPrefix,
  onUploaded,
  accept = "image/*,video/*",
  label = "Drop files here or click to upload",
}: {
  bucket: string;
  pathPrefix: string;
  onUploaded: (file: UploadedFile) => void | Promise<void>;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} exceeds the 50MB limit.`);
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const key = `${file.name}-${Date.now()}`;
      setProgress((p) => ({ ...p, [key]: 10 }));

      let upload: File | Blob = file;
      if (isImage) {
        try {
          upload = await imageCompression(file, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
          });
        } catch {
          upload = file;
        }
      }
      setProgress((p) => ({ ...p, [key]: 50 }));

      const ext = file.name.split(".").pop() ?? (isImage ? "jpg" : "mp4");
      const safe = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();
      const storagePath = `${pathPrefix}/${safe}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, upload, { upsert: false });

      if (upErr) {
        setError(`Failed to upload ${file.name}.`);
        setProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
        continue;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      setProgress((p) => ({ ...p, [key]: 100 }));
      await onUploaded({
        url: data.publicUrl,
        storagePath,
        type: isImage ? "image" : "video",
      });
      setTimeout(() => {
        setProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }, 800);
    }
  };

  const entries = Object.entries(progress);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-gold bg-gold/5"
            : "border-border hover:border-gold/40",
        )}
      >
        <p className="font-cinzel text-xs uppercase tracking-widest text-muted">
          {label}
        </p>
        <p className="mt-1 text-[10px] text-subtle">Max 50MB per file</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {entries.length > 0 ? (
        <div className="mt-3 space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="h-1 w-full bg-border">
              <div
                className="h-1 bg-gold transition-all"
                style={{ width: `${value}%` }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
