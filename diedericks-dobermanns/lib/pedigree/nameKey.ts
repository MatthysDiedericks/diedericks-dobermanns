/** Join key for ancestor_photos. Must match the SQL: lower(btrim(registered_name)). */
export function ancestorNameKey(registeredName: string | null | undefined): string | null {
  const key = registeredName?.trim().toLowerCase() ?? '';
  return key.length > 0 ? key : null;
}
