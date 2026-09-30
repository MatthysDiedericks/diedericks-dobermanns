import { colourLabel } from "@/lib/colours/dogColours";
import { puppyDidNotSurvive } from "@/lib/litters/outcomes";

/**
 * What the allocation screen has to show before anyone picks a puppy.
 * A dropdown of "K1 (orange)" is not a decision.
 */

export type ChoicePuppy = {
  id: string;
  name: string;
  sex?: string | null;
  colour?: string | null;
  collar_colour?: string | null;
  status?: string | null;
  outcome?: string | null;
  deceased_at?: string | null;
  tail_type?: string | null;
  programme_tier?: string | null;
  litter_default_programme_tier?: string | null;
};

export type ChoiceBuyer = {
  preferred_sex?: string | null;
  preferred_colour?: string | null;
  preferred_category?: string | null;
  tail_preference?: string | null;
  ear_preference?: string | null;
  registration_type?: string | null;
  preference_notes?: string | null;
  admin_notes?: string | null;
};

const UNSET = new Set(["", "any", "no_preference", "either", "none"]);

export function normalizeSex(value: string | null | undefined): "male" | "female" | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v || UNSET.has(v)) return null;
  if (v.startsWith("m")) return "male";
  if (v.startsWith("f")) return "female";
  return null;
}

export function isAllocatablePuppy(dog: {
  status?: string | null;
  outcome?: string | null;
  deceased_at?: string | null;
}): boolean {
  return !puppyDidNotSurvive(dog);
}

function collarBit(colour: string | null | undefined): string {
  if (!colour || colour === "none") return "no collar";
  return colour.trim().toLowerCase();
}

export function tierChipLabel(category: string | null | undefined): string {
  const raw = category?.trim().toLowerCase() ?? "";
  if (!raw || UNSET.has(raw)) return "No preference";
  if (raw === "elite" || raw === "elite_developed") return "Elite developed";
  if (raw === "standard" || raw === "puppy") return "Standard";
  if (raw === "protection" || raw === "protection_dog") return "Protection";
  return raw.replace(/_/g, " ");
}

export function preferenceValueLabel(
  value: string | null | undefined,
  kind: "sex" | "colour" | "tail" | "ears" | "registration",
): string {
  const raw = value?.trim() ?? "";
  if (!raw || UNSET.has(raw.toLowerCase())) return "No preference";
  if (kind === "colour") return colourLabel(raw);
  if (kind === "sex") {
    const sex = normalizeSex(raw);
    if (sex === "male") return "Male";
    if (sex === "female") return "Female";
  }
  if (kind === "tail") {
    if (raw === "docked") return "Docked";
    if (raw === "natural") return "Natural";
  }
  if (kind === "ears") {
    if (raw === "cropped" || raw === "crop" || raw === "cropping") return "Cropped";
    if (raw === "natural") return "Natural";
  }
  return raw.replace(/_/g, " ");
}

/** `K2 · purple · male · black & tan` */
export function puppyChoiceLabel(puppy: ChoicePuppy): string {
  const sex = normalizeSex(puppy.sex) ?? "sex not set";
  const colour = puppy.colour ? colourLabel(puppy.colour).toLowerCase() : "colour not set";
  return `${puppy.name} · ${collarBit(puppy.collar_colour)} · ${sex} · ${colour}`;
}

function nameAndCollar(puppy: ChoicePuppy): string {
  return `${puppy.name} ${collarBit(puppy.collar_colour)}`;
}

export function livePuppySummary(puppies: ChoicePuppy[]): { countLine: string; colourLine: string } {
  const live = puppies.filter(isAllocatablePuppy);
  const males = live.filter((p) => normalizeSex(p.sex) === "male");
  const females = live.filter((p) => normalizeSex(p.sex) === "female");
  const other = live.length - males.length - females.length;
  const maleBit = `${males.length} male (${males.map(nameAndCollar).join(", ") || "none"})`;
  const femaleBit = `${females.length} female (${females.map(nameAndCollar).join(", ") || "none"})`;
  const otherBit = other > 0 ? ` · ${other} sex not set` : "";
  const colours = [
    ...new Set(live.map((p) => (p.colour ? colourLabel(p.colour).toLowerCase() : "colour not set"))),
  ];
  const colourLine =
    live.length === 0
      ? "No live pups"
      : colours.length === 1
        ? `All ${colours[0]}`
        : colours.join(" · ");
  return {
    countLine: `${live.length} live pup${live.length === 1 ? "" : "s"} — ${maleBit} · ${femaleBit}${otherBit}`,
    colourLine,
  };
}

export type SupplyDemandLine = { label: string; value: string };

function tierBucket(category: string | null | undefined): "elite" | "standard" | "other" | "open" {
  const raw = category?.trim().toLowerCase() ?? "";
  if (!raw || UNSET.has(raw)) return "open";
  if (raw === "elite" || raw === "elite_developed") return "elite";
  if (raw === "standard" || raw === "puppy") return "standard";
  return "other";
}

export function supplyDemandSummary(
  entries: ChoiceBuyer[],
  puppies: ChoicePuppy[],
): { lines: SupplyDemandLine[]; colourGaps: string[] } {
  const live = puppies.filter(isAllocatablePuppy);
  const males = live.filter((p) => normalizeSex(p.sex) === "male");
  const females = live.filter((p) => normalizeSex(p.sex) === "female");
  const wantMale = entries.filter((e) => normalizeSex(e.preferred_sex) === "male").length;
  const wantFemale = entries.filter((e) => normalizeSex(e.preferred_sex) === "female").length;
  const wantOpen = entries.length - wantMale - wantFemale;
  const wantElite = entries.filter((e) => tierBucket(e.preferred_category) === "elite").length;
  const wantStandard = entries.filter((e) => tierBucket(e.preferred_category) === "standard").length;
  const list = (rows: ChoicePuppy[]) =>
    rows.length ? rows.map(nameAndCollar).join(", ") : "none";
  const lines: SupplyDemandLine[] = [
    { label: "Want a male", value: String(wantMale) },
    { label: "Want a female", value: String(wantFemale) },
    { label: "No sex preference", value: String(wantOpen) },
    { label: "Males available", value: `${males.length} (${list(males)})` },
    { label: "Females available", value: `${females.length} (${list(females)})` },
    { label: "Want Elite developed", value: String(wantElite) },
    { label: "Want Standard", value: String(wantStandard) },
  ];
  const colours = [
    ...new Set(live.map((p) => (p.colour ? colourLabel(p.colour) : "Colour not set"))),
  ];
  lines.push({
    label: live.length === 1 ? "This puppy is" : `All ${live.length} puppies are`,
    value: colours.length ? colours.join(", ") : "—",
  });

  const liveColours = new Set(live.map((p) => p.colour).filter((c): c is string => Boolean(c)));
  const missing = new Map<string, number>();
  for (const entry of entries) {
    const colour = entry.preferred_colour?.trim();
    if (!colour || UNSET.has(colour.toLowerCase())) continue;
    if (liveColours.has(colour)) continue;
    missing.set(colour, (missing.get(colour) ?? 0) + 1);
  }
  const colourGaps = [...missing.entries()].map(([code, count]) => {
    const noun = count === 1 ? "person wants" : "people want";
    return `${count} ${noun} ${colourLabel(code)} — this litter has none`;
  });
  return { lines, colourGaps };
}

const READ_NOTE =
  /\b(later|wait(?:ing)?|next litter|another litter|volgende|waglys|wag\b|eers dan)\b/i;
const YEAR = /\b(?:19|20)\d{2}\b/;
const MONTH =
  /\b(jan(?:uary|uarie)?|feb(?:ruary|ruarie)?|mar(?:ch)?|maart|apr(?:il)?|may|mei|jun(?:e|ie)?|jul(?:y|ie)?|aug(?:ust|ustus)?|sep(?:t(?:ember)?)?|oct(?:ober)?|oktober|nov(?:ember)?|dec(?:ember)?|desember)\b/i;
const QUANTITY = /\b\d+\b|\b(two|three|four|five|six|twee|drie|vier|vyf|ses)\b/i;

/** A prompt to read. It does not decide, and it does not write a hold. */
export function noteNeedsReading(notes: string | null | undefined): boolean {
  const text = notes?.trim();
  if (!text) return false;
  return READ_NOTE.test(text) || YEAR.test(text) || MONTH.test(text) || QUANTITY.test(text);
}

export type AttributeMark = "met" | "unknown" | "miss" | "block";

export type AttributeLine = {
  key: "sex" | "colour" | "tail" | "tier";
  label: string;
  mark: AttributeMark;
  text: string;
};

function knownProgrammeTier(puppy: ChoicePuppy): string | null {
  const tier = puppy.programme_tier || puppy.litter_default_programme_tier;
  return tier?.trim() || null;
}

export function attributeMatch(buyer: ChoiceBuyer, puppy: ChoicePuppy): AttributeLine[] {
  return [
    sexLine(buyer, puppy),
    colourLine(buyer, puppy),
    tailLine(buyer, puppy),
    tierLine(buyer, puppy),
  ];
}

function sexLine(buyer: ChoiceBuyer, puppy: ChoicePuppy): AttributeLine {
  const pref = normalizeSex(buyer.preferred_sex);
  const dog = normalizeSex(puppy.sex);
  if (!pref) return { key: "sex", label: "Sex", mark: "met", text: "No preference" };
  if (!dog) {
    return { key: "sex", label: "Sex", mark: "unknown", text: "not yet set on this puppy" };
  }
  if (pref === dog) return { key: "sex", label: "Sex", mark: "met", text: `wants ${pref}` };
  return {
    key: "sex",
    label: "Sex",
    mark: "block",
    text: `wants ${pref} — puppy is ${dog}`,
  };
}

function colourLine(buyer: ChoiceBuyer, puppy: ChoicePuppy): AttributeLine {
  const pref = buyer.preferred_colour?.trim() ?? "";
  if (!pref || UNSET.has(pref.toLowerCase())) {
    return { key: "colour", label: "Colour", mark: "met", text: "No preference" };
  }
  if (!puppy.colour) {
    return {
      key: "colour",
      label: "Colour",
      mark: "unknown",
      text: `wants ${colourLabel(pref).toLowerCase()} — not yet set on this puppy`,
    };
  }
  if (pref === puppy.colour) {
    return { key: "colour", label: "Colour", mark: "met", text: `wants ${colourLabel(pref).toLowerCase()}` };
  }
  return {
    key: "colour",
    label: "Colour",
    mark: "miss",
    text: `wants ${colourLabel(pref).toLowerCase()} — puppy is ${colourLabel(puppy.colour).toLowerCase()}`,
  };
}

function tailLine(buyer: ChoiceBuyer, puppy: ChoicePuppy): AttributeLine {
  const pref = buyer.tail_preference?.trim() ?? "";
  if (!pref || UNSET.has(pref.toLowerCase())) {
    return { key: "tail", label: "Tail", mark: "met", text: "No preference" };
  }
  const want = preferenceValueLabel(pref, "tail").toLowerCase();
  if (!puppy.tail_type) {
    return {
      key: "tail",
      label: "Tail",
      mark: "unknown",
      text: `wants ${want} — not yet decided on this puppy`,
    };
  }
  if (pref === puppy.tail_type) {
    return { key: "tail", label: "Tail", mark: "met", text: `wants ${want}` };
  }
  return {
    key: "tail",
    label: "Tail",
    mark: "miss",
    text: `wants ${want} — puppy is ${preferenceValueLabel(puppy.tail_type, "tail").toLowerCase()}`,
  };
}

function tierLine(buyer: ChoiceBuyer, puppy: ChoicePuppy): AttributeLine {
  const want = tierChipLabel(buyer.preferred_category);
  if (want === "No preference") {
    return { key: "tier", label: "Tier", mark: "met", text: "No preference" };
  }
  if (!knownProgrammeTier(puppy)) {
    return {
      key: "tier",
      label: "Tier",
      mark: "unknown",
      text: `wants ${want} — puppy not yet tiered`,
    };
  }
  const got = tierChipLabel(puppy.programme_tier || puppy.litter_default_programme_tier);
  if (want === got) return { key: "tier", label: "Tier", mark: "met", text: `wants ${want}` };
  return {
    key: "tier",
    label: "Tier",
    mark: "miss",
    text: `wants ${want} — puppy is ${got}`,
  };
}

export function sexesConflict(
  preferredSex: string | null | undefined,
  puppySex: string | null | undefined,
): boolean {
  const pref = normalizeSex(preferredSex);
  const dog = normalizeSex(puppySex);
  if (!pref || !dog) return false;
  return pref !== dog;
}

export const SEX_OVERRIDE_TOO_SHORT =
  "Write what is being overridden. Sex is not changed quietly.";

export function sexOverrideError(reason: string | null | undefined): string | null {
  if ((reason?.trim().length ?? 0) < 12) return SEX_OVERRIDE_TOO_SHORT;
  return null;
}

export function sexBlockCopy(buyer: ChoiceBuyer, puppy: ChoicePuppy): string | null {
  if (!sexesConflict(buyer.preferred_sex, puppy.sex)) return null;
  const want = preferenceValueLabel(buyer.preferred_sex, "sex").toLowerCase();
  const got = normalizeSex(puppy.sex);
  return `${puppy.name} is ${got}. This client asked for a ${want}. Allocate only if you record what is being overridden.`;
}

export function recordedSexOverrideNote(input: {
  puppyName: string;
  puppySex: string | null | undefined;
  preferredSex: string | null | undefined;
  reason: string;
  on?: string;
}): string {
  const day = input.on ?? new Date().toISOString().slice(0, 10);
  const want = preferenceValueLabel(input.preferredSex, "sex").toLowerCase();
  const got = normalizeSex(input.puppySex) ?? "sex unset";
  return `Sex override ${day}: asked for ${want}, allocated ${input.puppyName} (${got}). ${input.reason.trim()}`;
}

export function appendAdminNote(existing: string | null | undefined, line: string): string {
  const prior = existing?.trim();
  return prior ? `${prior}\n${line}` : line;
}

/** Null when allocation may proceed. Deceased is never overridable. */
export function allocationBlockReason(input: {
  puppy: ChoicePuppy;
  preferredSex: string | null | undefined;
  sexOverride?: string | null;
}): string | null {
  if (!isAllocatablePuppy(input.puppy)) {
    return `${input.puppy.name || "This puppy"} is deceased or stillborn and cannot be allocated.`;
  }
  if (sexesConflict(input.preferredSex, input.puppy.sex)) {
    const reasonError = sexOverrideError(input.sexOverride);
    if (reasonError) return `Sex does not match. ${reasonError}`;
  }
  return null;
}
