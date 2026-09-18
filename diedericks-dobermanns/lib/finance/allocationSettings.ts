export const DOG_DAYS_NURSING_KEY = "dog_days_nursing_multiplier";
export const DOG_DAYS_PUPPY_KEY = "dog_days_puppy_weight";
export const DAM_EXPECTED_LITTERS_KEY = "dam_expected_productive_litters";

export const DEFAULT_NURSING_MULTIPLIER = 2;
export const DEFAULT_PUPPY_WEIGHT = 0.5;
export const DEFAULT_EXPECTED_PRODUCTIVE_LITTERS = 5;

export type DogDaysSettings = {
  nursingMultiplier: number;
  puppyWeight: number;
  expectedProductiveLitters: number;
};

export const DEFAULT_DOG_DAYS_SETTINGS: DogDaysSettings = {
  nursingMultiplier: DEFAULT_NURSING_MULTIPLIER,
  puppyWeight: DEFAULT_PUPPY_WEIGHT,
  expectedProductiveLitters: DEFAULT_EXPECTED_PRODUCTIVE_LITTERS,
};

function parsePositiveNumber(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function dogDaysSettingsFromMap(
  map: Record<string, string | null | undefined> | Map<string, string | null>,
): DogDaysSettings {
  const get = (key: string) =>
    map instanceof Map ? map.get(key) : map[key];
  return {
    nursingMultiplier: parsePositiveNumber(
      get(DOG_DAYS_NURSING_KEY),
      DEFAULT_NURSING_MULTIPLIER,
    ),
    puppyWeight: parsePositiveNumber(get(DOG_DAYS_PUPPY_KEY), DEFAULT_PUPPY_WEIGHT),
    expectedProductiveLitters: Math.max(
      1,
      Math.round(
        parsePositiveNumber(
          get(DAM_EXPECTED_LITTERS_KEY),
          DEFAULT_EXPECTED_PRODUCTIVE_LITTERS,
        ),
      ),
    ),
  };
}
