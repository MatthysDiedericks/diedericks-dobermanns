import type { SkillLevel, TemperamentArea } from '@/lib/protection/types';

export const DEFAULT_DISCIPLINES = [
  'obedience',
  'protection',
  'tracking',
  'environmental',
  'household',
  'scenario',
] as const;

export const TEMPERAMENT_AREAS = [
  'With children',
  'With people',
  'Environment',
  'What he loves',
  'With other dogs',
  'What he needs',
] as const;

export const SKILL_LEVELS: SkillLevel[] = ['building', 'solid', 'proofed'];

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  building: 'Building',
  solid: 'Solid',
  proofed: 'Proofed',
};

export const LEVEL_KEY =
  'Building — still being taught. Solid — reliable in known work. Proofed — holds under pressure.';

export const SHOW_LEVEL_PUBLIC = true;

export function emptyTemperament(): TemperamentArea[] {
  return TEMPERAMENT_AREAS.map((area) => ({ area, body: '' }));
}

export function parseTemperament(value: unknown): TemperamentArea[] {
  const fallback = emptyTemperament();
  if (!Array.isArray(value)) return fallback;
  const byArea = new Map<string, string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const area = String((item as { area?: unknown }).area ?? '').trim();
    const body = String((item as { body?: unknown }).body ?? '');
    if (area) byArea.set(area, body);
  }
  const known = fallback.map((row) => ({
    area: row.area,
    body: byArea.get(row.area) ?? '',
  }));
  const extras = [...byArea.entries()]
    .filter(([area]) => !TEMPERAMENT_AREAS.includes(area as (typeof TEMPERAMENT_AREAS)[number]))
    .map(([area, body]) => ({ area, body }));
  return [...known, ...extras];
}

export function filledTemperament(areas: TemperamentArea[]): TemperamentArea[] {
  return areas.filter((a) => a.body.trim().length > 0);
}

export function disciplineLabel(discipline: string): string {
  return discipline.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isScenario(discipline: string): boolean {
  return discipline === 'scenario';
}

export function hasLevel(discipline: string, level: SkillLevel | null): boolean {
  return !isScenario(discipline) && Boolean(level);
}

export function isLibrarySkill(label: string): boolean {
  return label.trim().length > 0;
}

export function collectDisciplines(
  library: { discipline: string }[],
  skills: { discipline: string }[],
): string[] {
  const seen = new Set<string>(DEFAULT_DISCIPLINES);
  for (const row of library) {
    if (row.discipline.trim()) seen.add(row.discipline.trim());
  }
  for (const row of skills) {
    if (row.discipline.trim()) seen.add(row.discipline.trim());
  }
  const extras = [...seen].filter(
    (d) => !(DEFAULT_DISCIPLINES as readonly string[]).includes(d),
  );
  extras.sort((a, b) => a.localeCompare(b));
  return [...DEFAULT_DISCIPLINES, ...extras];
}

export function librarySkillsFor<
  T extends { discipline: string; label: string; sort_order: number },
>(library: T[], discipline: string): T[] {
  return library
    .filter((r) => r.discipline === discipline && isLibrarySkill(r.label))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}
