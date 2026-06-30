export type BreedStandard = 'fci_kusa' | 'akc';
export type BloodlineType = 'european' | 'american' | 'mixed';

export interface StandardRange {
  min: number;
  max: number;
  ideal?: number;
  unit: string;
}

export interface BreedStandardSpec {
  label: string;
  bloodlineNote: string;
  heightMale: StandardRange;
  heightFemale: StandardRange;
  weightMale: StandardRange;
  weightFemale: StandardRange;
  bodyRatioMaleMax: number;
  bodyRatioFemaleMax: number;
  chestDepthPctIdeal: number;
  chestDepthPctTolerance: number;
  measurementInstructions: {
    height: string;
    bodyLength: string;
    chestDepth: string;
    chestGirth: string;
    weight: string;
  };
}

export const BREED_STANDARDS: Record<BreedStandard, BreedStandardSpec> = {
  fci_kusa: {
    label: 'KUSA / FCI Standard (European)',
    bloodlineNote:
      'European Dobermanns are bred to FCI Standard N° 143, translated and adopted by KUSA. Natural ears and tail. ZTP suitability test required for breeding animals.',
    heightMale: { min: 68, max: 72, ideal: 70, unit: 'cm' },
    heightFemale: { min: 63, max: 68, ideal: 65, unit: 'cm' },
    weightMale: { min: 40, max: 45, unit: 'kg' },
    weightFemale: { min: 32, max: 35, unit: 'kg' },
    bodyRatioMaleMax: 105,
    bodyRatioFemaleMax: 110,
    chestDepthPctIdeal: 50,
    chestDepthPctTolerance: 8,
    measurementInstructions: {
      height:
        'Stand dog squarely on a flat surface. Measure vertically from the ground to the highest point of the withers.',
      bodyLength:
        'Measure horizontally from the point of the shoulder to the point of the buttock. Keep tape parallel to the ground.',
      chestDepth:
        'Measure vertically from the withers down to the lowest point of the sternum. Should be approximately half the wither height.',
      chestGirth:
        'Wrap a flexible tape around the deepest part of the chest, directly behind the front legs.',
      weight: 'Weigh on a calibrated scale. Record in kilograms.',
    },
  },
  akc: {
    label: 'AKC Standard (American)',
    bloodlineNote:
      'American Doberman Pinschers follow the AKC standard — heavier build, broader heads. Cropped ears and docked tail are traditional. DPCA administers temperament certifications.',
    heightMale: { min: 66, max: 71, ideal: 69, unit: 'cm' },
    heightFemale: { min: 61, max: 66, ideal: 64, unit: 'cm' },
    weightMale: { min: 34, max: 45, unit: 'kg' },
    weightFemale: { min: 27, max: 41, unit: 'kg' },
    bodyRatioMaleMax: 102,
    bodyRatioFemaleMax: 108,
    chestDepthPctIdeal: 50,
    chestDepthPctTolerance: 10,
    measurementInstructions: {
      height: 'Measure vertically from the ground to the top of the withers. Record in centimetres.',
      bodyLength:
        'Measure from the point of the breastbone to the rear of the upper thigh. Square build preferred.',
      chestDepth: 'Measure from the withers to the deepest point of the chest. Brisket should reach the elbow.',
      chestGirth: 'Wrap tape around the chest at the widest point behind the front legs.',
      weight: 'Weigh on a calibrated scale. Record in kilograms.',
    },
  },
};

export const TEMPERAMENT_GRADES = [
  { label: 'Excellent', minScore: 70, color: '#C4A35A' },
  { label: 'Good', minScore: 55, color: '#7EB77F' },
  { label: 'Adequate', minScore: 40, color: '#E8A838' },
  { label: 'Poor', minScore: 0, color: '#C24E4E' },
] as const;

export function getTemperamentGrade(totalScore: number) {
  return TEMPERAMENT_GRADES.find((g) => totalScore >= g.minScore) ?? TEMPERAMENT_GRADES[3];
}

export type MeasureStatus = 'ideal' | 'within' | 'below' | 'above';

export function evalHeight(
  heightCm: number,
  standard: BreedStandard,
  sex: 'male' | 'female',
): { status: MeasureStatus; label: string } {
  const range = sex === 'male' ? BREED_STANDARDS[standard].heightMale : BREED_STANDARDS[standard].heightFemale;
  if (heightCm < range.min) return { status: 'below', label: 'Below standard' };
  if (heightCm > range.max) return { status: 'above', label: 'Above standard' };
  if (range.ideal && Math.abs(heightCm - range.ideal) <= 1) return { status: 'ideal', label: 'Ideal' };
  return { status: 'within', label: 'Within standard' };
}

export function evalWeight(
  weightKg: number,
  standard: BreedStandard,
  sex: 'male' | 'female',
): { status: MeasureStatus; label: string } {
  const range = sex === 'male' ? BREED_STANDARDS[standard].weightMale : BREED_STANDARDS[standard].weightFemale;
  if (weightKg < range.min) return { status: 'below', label: 'Below standard' };
  if (weightKg > range.max) return { status: 'above', label: 'Above standard' };
  const mid = (range.min + range.max) / 2;
  if (Math.abs(weightKg - mid) <= (range.max - range.min) * 0.15) return { status: 'ideal', label: 'Ideal' };
  return { status: 'within', label: 'Within standard' };
}

export function evalBodyRatio(
  bodyLengthCm: number,
  heightCm: number,
  standard: BreedStandard,
  sex: 'male' | 'female',
): { ratio: number; status: MeasureStatus; label: string } {
  const ratio = (bodyLengthCm / heightCm) * 100;
  const max = sex === 'male' ? BREED_STANDARDS[standard].bodyRatioMaleMax : BREED_STANDARDS[standard].bodyRatioFemaleMax;
  if (ratio <= max - 3) return { ratio, status: 'ideal', label: 'Within range' };
  if (ratio <= max) return { ratio, status: 'within', label: 'Within range' };
  return { ratio, status: 'above', label: 'Above ratio limit' };
}

export function evalChestDepth(
  chestDepthCm: number,
  heightCm: number,
  standard: BreedStandard,
): { pct: number; status: MeasureStatus; label: string } {
  const pct = (chestDepthCm / heightCm) * 100;
  const { chestDepthPctIdeal, chestDepthPctTolerance } = BREED_STANDARDS[standard];
  if (Math.abs(pct - chestDepthPctIdeal) <= 3) return { pct, status: 'ideal', label: 'Within range' };
  if (Math.abs(pct - chestDepthPctIdeal) <= chestDepthPctTolerance) return { pct, status: 'within', label: 'Within range' };
  return { pct, status: pct < chestDepthPctIdeal ? 'below' : 'above', label: 'Outside ideal' };
}

export function statusColor(status: MeasureStatus): string {
  if (status === 'ideal') return '#C4A35A';
  if (status === 'within') return '#7EB77F';
  return '#E8A838';
}
