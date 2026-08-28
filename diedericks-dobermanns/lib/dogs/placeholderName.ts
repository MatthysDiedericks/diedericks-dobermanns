/** Kennel placeholders like "Puppy 7" / "Pup 1". Never use these as the buyer's name. */
export const PLACEHOLDER_DOG_NAME = /^\s*(puppy|pup)\s*[0-9]/i;

export function isPlaceholderDogName(name: string | null | undefined): boolean {
  const t = name?.trim() ?? '';
  if (!t) return true;
  return PLACEHOLDER_DOG_NAME.test(t);
}

/** Call name first, then kennel name — only if neither is a placeholder. */
export function realDogName(
  callName: string | null | undefined,
  kennelName: string | null | undefined,
): string | null {
  const call = callName?.trim() ?? '';
  if (call && !PLACEHOLDER_DOG_NAME.test(call)) return call;
  const kennel = kennelName?.trim() ?? '';
  if (kennel && !PLACEHOLDER_DOG_NAME.test(kennel)) return kennel;
  return null;
}

/** Persist the name the buyer uses. Replaces a placeholder kennel `name` so lists stop showing "Puppy 7". */
export function buyerNameFields(
  currentName: string | null | undefined,
  buyerName: string,
): { call_name: string; name?: string } {
  const name = buyerName.trim();
  const patch: { call_name: string; name?: string } = { call_name: name };
  if (isPlaceholderDogName(currentName)) patch.name = name;
  return patch;
}
