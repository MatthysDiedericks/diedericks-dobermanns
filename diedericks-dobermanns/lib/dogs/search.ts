import type { Dog } from '@/types/app.types';

export function matchesDogSearch(dog: Dog, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    dog.name.toLowerCase().includes(q) ||
    (dog.call_name?.toLowerCase().includes(q) ?? false) ||
    (dog.microchip_number?.toLowerCase().includes(q) ?? false)
  );
}
