import ReactMarkdown from "react-markdown";

/** Renders markdown content with the heritage-luxury type styles. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-5">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-cinzel text-3xl font-bold text-gold md:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 font-cinzel text-2xl text-gold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 font-cinzel text-lg uppercase tracking-widest text-gold-dim">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed text-muted">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-muted">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5 text-muted">
              {children}
            </ol>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-gold underline hover:text-gold-light">
              {children}
            </a>
          ),
          hr: () => <hr className="border-gold/20" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gold/40 pl-4 italic text-muted">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
