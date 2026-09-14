export type DogDataGap = "microchip" | "colour" | "documents" | "buyer";

export type GapDog = {
  microchip_number?: string | null;
  colour?: string | null;
  document_count?: number | null;
  status?: string | null;
  buyer_name?: string | null;
  buyer_contact_id?: string | null;
  owner_contact_id?: string | null;
  new_owner_name?: string | null;
  reserved_for_name?: string | null;
};

const GAP_LABELS: Record<DogDataGap, string> = {
  microchip: "no microchip",
  colour: "no colour",
  documents: "no documents",
  buyer: "sold with no buyer",
};

export function gapLabel(gap: DogDataGap): string {
  return GAP_LABELS[gap];
}

export function dogDataGaps(dog: GapDog): DogDataGap[] {
  const gaps: DogDataGap[] = [];
  if (!dog.microchip_number?.trim()) gaps.push("microchip");
  if (!dog.colour?.trim()) gaps.push("colour");
  if (dog.document_count != null && dog.document_count <= 0) gaps.push("documents");
  const sold = (dog.status ?? "").toLowerCase() === "sold";
  const buyer =
    dog.buyer_name?.trim() ||
    dog.new_owner_name?.trim() ||
    dog.reserved_for_name?.trim() ||
    dog.buyer_contact_id ||
    dog.owner_contact_id;
  if (sold && !buyer) gaps.push("buyer");
  return gaps;
}

export type GapSummary = {
  microchip: number;
  colour: number;
  documents: number;
  buyer: number;
  dogsFlagged: number;
};

export function summarizeGaps(dogs: GapDog[]): GapSummary {
  const summary: GapSummary = {
    microchip: 0,
    colour: 0,
    documents: 0,
    buyer: 0,
    dogsFlagged: 0,
  };
  for (const dog of dogs) {
    const gaps = dogDataGaps(dog);
    if (!gaps.length) continue;
    summary.dogsFlagged += 1;
    for (const g of gaps) summary[g] += 1;
  }
  return summary;
}

export function gapSummaryLine(summary: GapSummary): string | null {
  const parts: string[] = [];
  if (summary.microchip) {
    parts.push(
      `${summary.microchip} ${summary.microchip === 1 ? "puppy" : "puppies"} with no microchip`,
    );
  }
  if (summary.colour) {
    parts.push(`${summary.colour} with no colour`);
  }
  if (summary.documents) {
    parts.push(`${summary.documents} with no documents`);
  }
  if (summary.buyer) {
    parts.push(`${summary.buyer} sold with no buyer`);
  }
  if (!parts.length) return null;
  return parts.join(" · ");
}
