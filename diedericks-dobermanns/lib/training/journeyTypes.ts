export const TRAINING_TYPES = [
  { value: 'session', label: 'General Session' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'obedience', label: 'Obedience' },
  { value: 'protection', label: 'Protection' },
  { value: 'psa', label: 'PSA' },
  { value: 'socialization', label: 'Socialization' },
  { value: 'scenario', label: 'Scenario' },
] as const;

export const PHASES = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'development', label: 'Development' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'competition', label: 'Competition' },
] as const;

export const PROGRESS_LEVELS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'proofed', label: 'Proofed' },
] as const;

export type JourneyMedia = {
  id: string;
  media_type: string;
  public_url: string | null;
  storage_path: string | null;
  sort_order: number;
};

export type JourneyEntry = {
  id: string;
  dog_id: string;
  session_date: string;
  training_type: string;
  duration_minutes: number | null;
  milestone: string | null;
  progress_level: string | null;
  notes: string | null;
  phase: string | null;
  is_public: boolean;
  is_draft: boolean;
  training_log_media: JourneyMedia[];
};

export function typeLabel(value: string): string {
  return TRAINING_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function phaseLabel(value: string | null): string | null {
  if (!value) return null;
  return PHASES.find((p) => p.value === value)?.label ?? value;
}
