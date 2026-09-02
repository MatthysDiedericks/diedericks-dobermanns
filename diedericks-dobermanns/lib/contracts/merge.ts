/**
 * Fills {{token}} placeholders in a contract template body.
 * Unresolved tokens after merge must block sending — see unresolvedTokens().
 */

export type ContractTokenMap = Record<string, string>;

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function mergeContractBody(bodyHtml: string, tokens: ContractTokenMap): string {
  return bodyHtml.replace(TOKEN_RE, (_m, key: string) => {
    const value = tokens[key];
    return value == null || value === '' ? `{{${key}}}` : value;
  });
}

/** Tokens still present after merge — empty array means the body is complete. */
export function unresolvedTokens(bodyHtml: string): string[] {
  const found = new Set<string>();
  for (const m of bodyHtml.matchAll(TOKEN_RE)) found.add(m[1]);
  return [...found].sort();
}

export function replaceToken(bodyHtml: string, key: string, value: string): string {
  return bodyHtml.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
}
