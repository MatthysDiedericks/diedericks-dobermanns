type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** Compact hero used at the top of interior public pages. */
export function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="border-b border-gold/20 bg-surface">
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-28 text-center md:px-8 md:pt-32">
        {eyebrow ? (
          <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-gold-dim">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-cinzel text-4xl font-bold tracking-wide text-gold md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-2xl text-muted">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
