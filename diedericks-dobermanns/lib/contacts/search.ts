import { rowMatches } from '@/lib/search/match';
import type { ContactRow } from '@/types/phase10';

export type ContactAlias = {
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
};

export type ContactListItem = ContactRow & { alsoKnownAs: ContactAlias[] };

export type MergedContactAlias = ContactAlias & {
  id: string;
  merged_into_contact_id: string;
};

export function contactMatches(row: ContactListItem, query: string): boolean {
  if (
    rowMatches(query, {
      text: [row.full_name, row.email, row.city, row.company],
      phones: [row.phone, row.whatsapp_number],
    })
  ) {
    return true;
  }
  return row.alsoKnownAs.some((a) =>
    rowMatches(query, {
      text: [a.name, a.email],
      phones: [a.phone, a.whatsapp_number],
    }),
  );
}

export function matchedAliasName(row: ContactListItem, query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  const hit = row.alsoKnownAs.find((a) =>
    rowMatches(q, {
      text: [a.name, a.email],
      phones: [a.phone, a.whatsapp_number],
    }),
  );
  return hit?.name ?? null;
}

export function attachAliases(
  rows: ContactRow[],
  aliases: MergedContactAlias[],
): ContactListItem[] {
  const bySurvivor = new Map<string, ContactAlias[]>();
  for (const a of aliases) {
    const list = bySurvivor.get(a.merged_into_contact_id) ?? [];
    list.push({
      name: a.name,
      email: a.email,
      phone: a.phone,
      whatsapp_number: a.whatsapp_number,
    });
    bySurvivor.set(a.merged_into_contact_id, list);
  }
  return rows.map((r) => ({
    ...r,
    alsoKnownAs: bySurvivor.get(r.id) ?? [],
  }));
}
