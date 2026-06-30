import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow ? (
        <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-gold-dim mb-3">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-gold tracking-wide">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-muted leading-relaxed">{subtitle}</p>
      ) : null}
      <div
        className={cn(
          "mt-6 h-px w-20 bg-gold/40",
          align === "center" ? "mx-auto" : "",
        )}
      />
    </div>
  );
}
