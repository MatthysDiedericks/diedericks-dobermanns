/** Tag used by the unreachable worklist. Not a save bypass. */
export const CANNOT_TRACE_TAG = 'cannot_trace';

export function isBlankContactField(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

export function hasCannotTraceTag(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(CANNOT_TRACE_TAG);
}

export function withCannotTraceTag(tags: string[] | null | undefined): string[] {
  const next = [...(tags ?? [])];
  if (!next.includes(CANNOT_TRACE_TAG)) next.push(CANNOT_TRACE_TAG);
  return next;
}

export function isUnreachableContact(row: {
  phone: string | null;
  email: string | null;
  tags?: string[] | null;
}): boolean {
  return (
    isBlankContactField(row.phone) &&
    isBlankContactField(row.email) &&
    !hasCannotTraceTag(row.tags)
  );
}
