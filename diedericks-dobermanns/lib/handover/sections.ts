/**
 * Pack section query parameter. Cover is always included. Unknown tokens ignored.
 */
export const PACK_GROUP_KEYS = [
  'parentage',
  'health',
  'sire',
  'dam',
  'contract',
  'care',
] as const;

export type PackGroupKey = (typeof PACK_GROUP_KEYS)[number];

const GROUP_SET = new Set<string>(PACK_GROUP_KEYS);
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PackChoice = {
  all: boolean;
  groups: Set<PackGroupKey>;
  certIds: Set<string>;
};

export const EMPTY_CHOICE: PackChoice = {
  all: true,
  groups: new Set(PACK_GROUP_KEYS),
  certIds: new Set(),
};

export function parsePackQuery(raw: string | null | undefined): PackChoice {
  if (!raw || !raw.trim()) return { ...EMPTY_CHOICE, groups: new Set(PACK_GROUP_KEYS) };
  const groups = new Set<PackGroupKey>();
  const certIds = new Set<string>();
  for (const token of raw.split(',')) {
    const t = token.trim();
    if (!t || t === 'cover') continue;
    if (GROUP_SET.has(t)) {
      groups.add(t as PackGroupKey);
      continue;
    }
    const id = t.startsWith('c.') ? t.slice(2) : t;
    if (UUID.test(id)) certIds.add(id.toLowerCase());
  }
  return { all: false, groups, certIds };
}

export function serializePackQuery(choice: PackChoice): string {
  if (choice.all) return '';
  const parts: string[] = [];
  for (const key of PACK_GROUP_KEYS) {
    if (choice.groups.has(key)) parts.push(key);
  }
  for (const id of choice.certIds) parts.push(`c.${id}`);
  return parts.join(',') || 'cover';
}

export function packQueryString(choice: PackChoice): string {
  const q = serializePackQuery(choice);
  return q ? `?pack=${encodeURIComponent(q)}` : '';
}

export function hasGroup(choice: PackChoice, key: PackGroupKey): boolean {
  return choice.all || choice.groups.has(key);
}

export function includesCert(
  choice: PackChoice,
  certId: string,
  parentRole: 'sire' | 'dam',
): boolean {
  if (choice.all) return true;
  if (choice.groups.has(parentRole)) return true;
  return choice.certIds.has(certId.toLowerCase());
}

export function formatPackBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
