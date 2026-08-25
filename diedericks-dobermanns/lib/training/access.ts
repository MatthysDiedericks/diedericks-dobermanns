export type AccessTier = "public" | "owner" | "paid";

export const ACCESS_TIERS: AccessTier[] = ["public", "owner", "paid"];

export const TIER_LABEL: Record<AccessTier, string> = {
  public: "Public",
  owner: "Included with a puppy",
  paid: "Paid extra",
};

export function normalizeTier(raw: string | null | undefined): AccessTier {
  if (raw === "owner") return "owner";
  if (raw === "paid" || raw === "bundle" || raw === "admin") return "paid";
  return "public";
}

/**
 * THE paid unlock path. One function, one caller (`canWatchVideo`).
 * A future checkout writes `video_bundle_purchases` and this starts returning true.
 */
export function clientHasPaidAccess(
  purchasedBundleIds: ReadonlySet<string>,
  bundleId: string | null,
): boolean {
  return Boolean(bundleId && purchasedBundleIds.has(bundleId));
}

export function canWatchVideo(input: {
  accessTier: string;
  bundleId: string | null;
  purchasedBundleIds: ReadonlySet<string>;
  ownsADog: boolean;
  isStaff: boolean;
}): boolean {
  if (input.isStaff) return true;
  const tier = normalizeTier(input.accessTier);
  if (tier === "public") return true;
  if (tier === "owner") return input.ownsADog;
  return clientHasPaidAccess(input.purchasedBundleIds, input.bundleId);
}

export function videoHasFile(url: string | null | undefined): boolean {
  return Boolean(url && url.trim().length > 0);
}
