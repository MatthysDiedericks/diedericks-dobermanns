/** Four cost classes. `company` never touches an animal. `shared` is split at capture. */

export const ALLOCATION_TYPES = ["company", "shared", "dog", "litter"] as const;
export type AllocationType = (typeof ALLOCATION_TYPES)[number];

export function normalizeAllocationType(
  value: string | null | undefined,
): AllocationType {
  if (value === "dog" || value === "litter" || value === "company") return value;
  return "shared";
}

export function allocationTypeLabel(value: string | null | undefined): string {
  const t = normalizeAllocationType(value);
  if (t === "dog") return "Direct to a dog";
  if (t === "litter") return "Direct to a litter";
  if (t === "company") return "Company overhead";
  return "Shared kennel overhead";
}

export function isSharedAllocation(value: string | null | undefined): boolean {
  return normalizeAllocationType(value) === "shared";
}

export function isCompanyAllocation(value: string | null | undefined): boolean {
  return normalizeAllocationType(value) === "company";
}
