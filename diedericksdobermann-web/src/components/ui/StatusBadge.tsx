import { cn } from "@/lib/utils";
import { humanize } from "@/lib/utils";

type Tone = "available" | "reserved" | "neutral" | "muted" | "gold";

const toneClasses: Record<Tone, string> = {
  available: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  reserved: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  neutral: "border-border text-muted bg-elevated",
  muted: "border-subtle/40 text-subtle bg-transparent",
  gold: "border-gold/40 text-gold bg-gold/10",
};

/** Maps a dog/application/booking status string to a visual tone. */
function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["available", "approved", "confirmed", "born", "published"].includes(s))
    return "available";
  if (
    ["reserved", "pending", "waitlisted", "expected", "scheduled"].includes(s)
  )
    return "reserved";
  if (["sold", "rejected", "cancelled", "closed", "archived"].includes(s))
    return "muted";
  return "neutral";
}

type Props = {
  status: string;
  label?: string;
  tone?: Tone;
  className?: string;
};

export function StatusBadge({ status, label, tone, className }: Props) {
  const resolved = tone ?? statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-cinzel uppercase tracking-[0.15em]",
        toneClasses[resolved],
        className,
      )}
    >
      {label ?? humanize(status)}
    </span>
  );
}
