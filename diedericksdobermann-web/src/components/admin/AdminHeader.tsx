import Link from "next/link";

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-cinzel text-2xl text-gold md:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 rounded-sm bg-gold px-5 py-2.5 font-cinzel text-xs uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
