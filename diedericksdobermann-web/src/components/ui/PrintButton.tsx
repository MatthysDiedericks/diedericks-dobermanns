"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-sm border border-gold/40 px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold/10"
    >
      Print
    </button>
  );
}
