/** Progressive density: cells carry less as they sit further right. */

export function cellShowsPhoto(generation: number): boolean {
  return generation <= 2;
}

export function ancestorFieldMask(generation: number): {
  showTitles: boolean;
  showDob: boolean;
  showRegistration: boolean;
} {
  return {
    showTitles: generation <= 3,
    showDob: generation <= 2,
    showRegistration: generation <= 1,
  };
}

export function borderClassFor(generation: number, empty: boolean): string {
  if (empty) return 'border-[#C4A35A]/[0.08]';
  switch (generation) {
    case 0:
      return 'border-[#C4A35A]';
    case 1:
      return 'border-[#C4A35A]/45';
    case 2:
      return 'border-[#C4A35A]/25';
    case 3:
      return 'border-[#C4A35A]/[0.14]';
    default:
      return 'border-[#C4A35A]/10';
  }
}
