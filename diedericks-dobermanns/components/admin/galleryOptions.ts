export type Destination = 'gallery' | 'dog' | 'litter' | 'timeline';

export const DESTINATIONS: { value: Destination; label: string }[] = [
  { value: 'gallery', label: 'Gallery category' },
  { value: 'dog', label: 'A specific dog' },
  { value: 'litter', label: 'A litter (photos or the announcement poster)' },
  { value: 'timeline', label: 'Timeline (attaches to a dog\'s journey)' },
];

export const CATEGORIES = [
  { value: 'puppies', label: 'Puppies' },
  { value: 'elite_pups', label: 'Elite Pups' },
  { value: 'protection_dogs', label: 'Elite Family Protection Dogs' },
  { value: 'planned_litters', label: 'Planned Litters' },
  { value: 'litter_announcements', label: 'Litter Announcement (poster)' },
  { value: 'competition', label: 'Competition' },
  { value: 'training', label: 'Training' },
  { value: 'kennel', label: 'Kennel' },
  { value: 'family', label: 'Family' },
];

export const GALLERY_CATEGORIES = CATEGORIES.filter(
  (c) => c.value !== 'litter_announcements' && c.value !== 'planned_litters',
);

export const LITTER_CATEGORIES = CATEGORIES.filter(
  (c) => c.value === 'litter_announcements' || c.value === 'planned_litters',
);

export const DISCIPLINES = [
  { value: 'protection', label: 'Protection' },
  { value: 'obedience', label: 'Obedience' },
];

export type LitterPickerOption = {
  id: string;
  name: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  mother?: { name: string } | null;
  father?: { name: string } | null;
};

export function litterPickerLabel(litter: LitterPickerOption): string {
  if (litter.name?.trim()) return litter.name.trim();
  const father = litter.father?.name;
  const mother = litter.mother?.name;
  if (father && mother) return `${father} × ${mother}`;
  return 'Untitled litter';
}
