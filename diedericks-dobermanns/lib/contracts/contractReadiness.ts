export type ContractBlocker =
  | 'zero_price'
  | 'unresolved_tokens'
  | 'no_dog'
  | 'no_buyer_identity';

const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;
const ZERO_PRICE_RE = /R\s*0[,.]00/;

const TOKEN_LABELS: Record<string, string> = {
  dog_microchip: 'Microchip number',
  buyer_id_number: 'Buyer ID number',
  dog_registration: 'Registration number',
  dog_colour: 'Colour',
  purchase_price: 'Purchase price',
  amount_paid: 'Amount paid',
  buyer_full_name: 'Buyer name',
  buyer_address: 'Buyer address',
};

export function tokenLabel(token: string): string {
  return TOKEN_LABELS[token] ?? token.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function contractUnresolvedTokens(bodyHtml: string | null): string[] {
  const found = new Set<string>();
  for (const m of (bodyHtml ?? '').matchAll(TOKEN_RE)) found.add(m[1]);
  return [...found].sort();
}

export function hasZeroOrMissingPrice(bodyHtml: string | null): boolean {
  if (!bodyHtml || !bodyHtml.trim()) return true;
  if (/\{\{\s*purchase_price\s*\}\}/.test(bodyHtml)) return true;
  if (ZERO_PRICE_RE.test(bodyHtml)) return true;
  if (/purchase price[^<]{0,80}—/i.test(bodyHtml)) return true;
  return false;
}

export function contractBlockers(contract: {
  body_html: string | null;
  dog_id: string | null;
  client_id: string | null;
  contact_id: string | null;
}): ContractBlocker[] {
  const out: ContractBlocker[] = [];
  if (!contract.dog_id) out.push('no_dog');
  if (!contract.client_id && !contract.contact_id) out.push('no_buyer_identity');
  if (contractUnresolvedTokens(contract.body_html).length > 0) out.push('unresolved_tokens');
  if (hasZeroOrMissingPrice(contract.body_html)) out.push('zero_price');
  return out;
}

export function sendBlockMessage(contract: {
  body_html: string | null;
  dog_id: string | null;
  client_id: string | null;
  contact_id: string | null;
}): string | null {
  const blockers = contractBlockers(contract);
  if (blockers.length === 0) return null;
  const parts: string[] = [];
  const tokens = contractUnresolvedTokens(contract.body_html);
  if (tokens.length) parts.push(tokens.map(tokenLabel).join(', '));
  if (blockers.includes('zero_price') && !tokens.includes('purchase_price')) parts.push('Purchase price');
  if (blockers.includes('no_dog')) parts.push('a dog');
  if (blockers.includes('no_buyer_identity')) parts.push('a buyer');
  return `This agreement is not ready to send. Missing: ${parts.join('; ')}.`;
}

export const BUYER_FINALISING_LINE =
  'This agreement is being finalised. Matt will send it through shortly.';
