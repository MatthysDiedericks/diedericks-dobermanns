import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { DogStatus } from '@/types/app.types';

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  keep: { label: 'Breeding Female', tone: 'gold' },
  stud: { label: 'Stud', tone: 'gold' },
  breeding_stock: { label: 'Breeding', tone: 'gold' },
  deceased: { label: 'In Memory', tone: 'muted' },
  sold: { label: 'Alumni', tone: 'muted' },
  retired: { label: 'Retired', tone: 'muted' },
  donated: { label: 'Alumni', tone: 'muted' },
  gifted: { label: 'Alumni', tone: 'muted' },
  in_training: { label: 'In Training', tone: 'neutral' },
  puppy: { label: 'Puppy', tone: 'muted' },
  available: { label: 'Available', tone: 'gold' },
  reserved: { label: 'Reserved', tone: 'neutral' },
};

export function DogStatusBadge({
  status,
  alumniLabel,
}: {
  status: DogStatus | null;
  alumniLabel?: boolean;
}) {
  if (!status) return null;
  if (alumniLabel && status === 'sold') {
    return <Badge label="Alumni" tone="muted" />;
  }
  const entry = STATUS_MAP[status];
  if (!entry) return null;
  return <Badge label={entry.label} tone={entry.tone} />;
}
