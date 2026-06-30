import type { DogMedia } from "@/types/app";

/** Returns the best display image URL for a dog from its media set. */
export function dogPrimaryImage(media: DogMedia[] | null | undefined) {
  if (!media || media.length === 0) return null;
  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const primary = sorted.find((m) => m.is_primary && m.type === "image");
  const firstImage = sorted.find((m) => m.type === "image");
  return (primary ?? firstImage)?.url ?? null;
}

/** Splits media into images and videos, ordered by sort_order. */
export function splitMedia(media: DogMedia[] | null | undefined) {
  const sorted = [...(media ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  return {
    images: sorted.filter((m) => m.type === "image"),
    videos: sorted.filter((m) => m.type === "video"),
  };
}
