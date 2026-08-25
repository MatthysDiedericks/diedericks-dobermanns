/** Resolve a litter detail tab from a route/search param. Unknown values fall back silently. */

export function resolveLitterTab<T extends string>(
  keys: readonly T[],
  requested: string | string[] | undefined,
  fallback: T,
): T {
  const value = Array.isArray(requested) ? requested[0] : requested;
  if (value && (keys as readonly string[]).includes(value)) return value as T;
  return fallback;
}
