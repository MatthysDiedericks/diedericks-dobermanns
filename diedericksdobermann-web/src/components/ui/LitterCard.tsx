import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { GoldLink } from "@/components/ui/GoldButton";
import { formatDate } from "@/lib/utils";
import type { LitterWithParents } from "@/types/app";

export function LitterCard({ litter }: { litter: LitterWithParents }) {
  const pairing =
    litter.mother?.name && litter.father?.name
      ? `${litter.father.name} × ${litter.mother.name}`
      : (litter.name ?? "Planned Litter");

  return (
    <div className="flex flex-col rounded-sm border border-gold/20 bg-surface p-6 transition-colors hover:border-gold/40">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/litters/${litter.id}`} className="group">
          <h3 className="font-cinzel text-xl text-text group-hover:text-gold transition-colors">
            {pairing}
          </h3>
        </Link>
        <StatusBadge status={litter.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-subtle">
            Expected
          </dt>
          <dd className="mt-1 text-muted">
            {formatDate(litter.expected_date)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-subtle">
            Available
          </dt>
          <dd className="mt-1 text-gold">
            {litter.available_count ?? "TBC"}
            {litter.puppy_count ? ` / ${litter.puppy_count}` : ""}
          </dd>
        </div>
      </dl>

      {litter.description ? (
        <p className="mt-4 line-clamp-2 text-sm text-muted">
          {litter.description}
        </p>
      ) : null}

      <div className="mt-6 pt-4 border-t border-gold/10">
        <GoldLink href={`/litters/${litter.id}`} variant="secondary" size="sm">
          Join Waitlist
        </GoldLink>
      </div>
    </div>
  );
}
