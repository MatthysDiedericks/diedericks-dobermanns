import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { dogPrimaryImage } from "@/lib/media";
import { humanize } from "@/lib/utils";
import type { DogWithMedia } from "@/types/app";

export function DogCard({ dog }: { dog: DogWithMedia }) {
  const image = dogPrimaryImage(dog.dog_media);

  return (
    <Link
      href={`/dogs/${dog.id}`}
      className="group relative block overflow-hidden rounded-sm border border-gold/20 bg-surface transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_30px_-8px_rgba(196,163,90,0.35)]"
    >
      <div className="relative aspect-square overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={dog.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-elevated">
            <span className="font-cinzel text-5xl text-gold/30">DD</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-4">
          <div>
            <p className="font-cinzel text-lg text-text drop-shadow">
              {dog.name}
            </p>
            <p className="text-xs uppercase tracking-widest text-gold-dim">
              {humanize(dog.category)}
            </p>
          </div>
          <StatusBadge status={dog.status} />
        </div>
      </div>
    </Link>
  );
}
