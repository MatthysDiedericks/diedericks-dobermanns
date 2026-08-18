import type { ReceiptRow } from "./types";

const TIER_ORDER = ["standard", "elite_developed", "protection_dog", "other"] as const;
export type IncomeTier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<IncomeTier, string> = {
  standard: "Standard",
  elite_developed: "Elite developed",
  protection_dog: "Protection dog",
  other: "Other",
};

export function classifyItemType(itemType: string | null | undefined): IncomeTier {
  const t = (itemType ?? "").toLowerCase();
  if (t.includes("elite")) return "elite_developed";
  if (t.includes("protection")) return "protection_dog";
  if (t === "dog" || t === "dog_sale" || t === "puppy" || t === "standard" || t === "deposit") {
    return "standard";
  }
  return "other";
}

/** Spread a receipt across invoice line types by line_total share. */
export function allocateReceiptByTier(
  amount: number,
  lines: { item_type: string; line_total: number }[],
): Record<IncomeTier, number> {
  const out: Record<IncomeTier, number> = {
    standard: 0,
    elite_developed: 0,
    protection_dog: 0,
    other: 0,
  };
  const total = lines.reduce((s, l) => s + Number(l.line_total ?? 0), 0);
  if (total <= 0 || lines.length === 0) {
    out.other = amount;
    return out;
  }
  for (const line of lines) {
    const share = amount * (Number(line.line_total ?? 0) / total);
    out[classifyItemType(line.item_type)] += share;
  }
  return out;
}

export function emptyTierMap(): Record<IncomeTier, number> {
  return { standard: 0, elite_developed: 0, protection_dog: 0, other: 0 };
}

export function addTier(
  a: Record<IncomeTier, number>,
  b: Record<IncomeTier, number>,
): Record<IncomeTier, number> {
  return {
    standard: a.standard + b.standard,
    elite_developed: a.elite_developed + b.elite_developed,
    protection_dog: a.protection_dog + b.protection_dog,
    other: a.other + b.other,
  };
}

export function receiptTierFallback(row: ReceiptRow): IncomeTier {
  if (row.source === "historical") return "other";
  return "standard";
}
