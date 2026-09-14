export const PROFILE_COMPLETENESS_FIELDS = [
  { key: "date_of_birth", label: "Date of birth", section: "identity" },
  { key: "sex", label: "Sex", section: "identity" },
  { key: "colour", label: "Colour", section: "identity" },
  { key: "coat_type", label: "Coat type", section: "identity" },
  { key: "size_category", label: "Size", section: "identity" },
  { key: "birth_weight_grams", label: "Birth weight", section: "identity" },
  { key: "birth_order", label: "Birth order", section: "identity" },
  { key: "collar_colour", label: "Collar", section: "identity" },
  { key: "microchip_number", label: "Microchip", section: "identifiers" },
  { key: "tattoo_number", label: "Tattoo", section: "identifiers" },
  { key: "passport_number", label: "Passport", section: "identifiers" },
  { key: "dna_number", label: "DNA number", section: "identifiers" },
  { key: "insurance_number", label: "Insurance", section: "identifiers" },
  { key: "registration_number", label: "Registration number", section: "identifiers" },
  { key: "registration_type", label: "Registration type", section: "identifiers" },
  { key: "litter_letter", label: "Litter letter", section: "identifiers" },
  { key: "height_cm", label: "Height", section: "measurements" },
  { key: "body_length_cm", label: "Body length", section: "measurements" },
  { key: "chest_depth_cm", label: "Chest depth", section: "measurements" },
  { key: "chest_girth_cm", label: "Chest girth", section: "measurements" },
  { key: "hip_score", label: "Hip score", section: "health" },
  { key: "elbow_score", label: "Elbow score", section: "health" },
] as const;

export type CompletenessFieldKey = (typeof PROFILE_COMPLETENESS_FIELDS)[number]["key"];

export type CompletenessSource = Partial<Record<CompletenessFieldKey, unknown>> & {
  litter_letter?: string | null;
};

function filled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 && t !== "none";
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return false;
}

export type CompletenessResult = {
  recorded: number;
  total: number;
  missing: { key: CompletenessFieldKey; label: string; section: string }[];
};

export function profileCompleteness(dog: CompletenessSource): CompletenessResult {
  const missing: CompletenessResult["missing"] = [];
  for (const field of PROFILE_COMPLETENESS_FIELDS) {
    if (!filled(dog[field.key])) {
      missing.push({ key: field.key, label: field.label, section: field.section });
    }
  }
  const total = PROFILE_COMPLETENESS_FIELDS.length;
  return { recorded: total - missing.length, total, missing };
}

export function completenessSummary(result: CompletenessResult): string {
  return `${result.recorded} of ${result.total} fields recorded`;
}
