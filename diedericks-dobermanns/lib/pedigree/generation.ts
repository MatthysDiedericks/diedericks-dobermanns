import { maxPedigreeGeneration } from '@/lib/pedigree/layout';

export type PedigreeSurface = 'admin' | 'public' | 'portal' | 'app';

export const PEDIGREE_DEPTH_STORAGE: Record<PedigreeSurface, string> = {
  admin: 'dd-pedigree-depth-admin',
  public: 'dd-pedigree-depth-public',
  portal: 'dd-pedigree-depth-portal',
  app: 'dd-pedigree-depth-app',
};

const SURFACE_DEFAULT: Record<PedigreeSurface, number> = {
  admin: 4,
  public: 4,
  portal: 3,
  app: 2,
};

export function pedigreeDepthOptions(maxGen: number, surface: PedigreeSurface): number[] {
  if (maxGen <= 0) return [];
  const floor = surface === 'app' ? 2 : 3;
  const start = Math.min(floor, maxGen);
  const out: number[] = [];
  for (let d = start; d <= maxGen; d++) out.push(d);
  return out;
}

export function defaultPedigreeDepth(maxGen: number, surface: PedigreeSurface): number {
  const options = pedigreeDepthOptions(maxGen, surface);
  if (options.length === 0) return 0;
  const preferred = SURFACE_DEFAULT[surface];
  if (options.includes(preferred)) return preferred;
  return options.reduce((best, d) =>
    Math.abs(d - preferred) < Math.abs(best - preferred) ? d : best,
  );
}

export function clampPedigreeDepth(
  requested: number,
  maxGen: number,
  surface: PedigreeSurface,
): number {
  const options = pedigreeDepthOptions(maxGen, surface);
  if (options.length === 0) return 0;
  if (options.includes(requested)) return requested;
  return defaultPedigreeDepth(maxGen, surface);
}

export function generationColumnTitle(generation: number): string {
  switch (generation) {
    case 1:
      return 'PARENTS';
    case 2:
      return 'GRANDPARENTS';
    case 3:
      return 'GREAT-GRANDPARENTS';
    default:
      return `${generation}TH GENERATION`;
  }
}

export function positionsForDepth(depth: number): string[] {
  if (depth <= 0) return [];
  const out: string[] = [];
  const walk = (prefix: string, remaining: number) => {
    if (remaining === 0) return;
    for (const side of ['S', 'D'] as const) {
      const next = prefix + side;
      out.push(next);
      walk(next, remaining - 1);
    }
  };
  walk('', depth);
  return out;
}
