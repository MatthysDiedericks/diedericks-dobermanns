export type BuyerKind = 'applicant' | 'user' | 'contact' | 'walkin';

export type QuoteBuyerOption = {
  key: string;
  kind: BuyerKind;
  id: string;
  label: string;
  hint: string;
};

export function buyerKey(kind: BuyerKind, id = ''): string {
  return kind === 'walkin' ? 'walkin' : `${kind}:${id}`;
}

export function parseBuyerKey(key: string): { kind: BuyerKind; id: string } {
  if (!key || key === 'walkin') return { kind: 'walkin', id: '' };
  const i = key.indexOf(':');
  if (i < 0) return { kind: 'walkin', id: '' };
  const kind = key.slice(0, i) as BuyerKind;
  return { kind, id: key.slice(i + 1) };
}

export function filterBuyerOptions(options: QuoteBuyerOption[], query: string): QuoteBuyerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) => o.label.toLowerCase().includes(q) || o.hint.toLowerCase().includes(q),
  );
}
