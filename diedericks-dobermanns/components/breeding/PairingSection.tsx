import { PairingCard } from '@/components/breeding/PairingCard';
import { Typography } from '@/components/ui/Typography';
import type { PairingRecord } from '@/types/breeding';

export function PairingSection({
  title,
  titleColor,
  pairings,
  onAction,
}: {
  title: string;
  titleColor: string;
  pairings: PairingRecord[];
  onAction: (p: PairingRecord) => void;
}) {
  if (pairings.length === 0) return null;
  return (
    <>
      <Typography variant="label" className="mb-2 mt-2" style={{ color: titleColor }}>
        {title}
      </Typography>
      {pairings.map((p) => (
        <PairingCard
          key={p.id}
          pairing={p}
          actionLabel={
            p.status === 'Completed' ? 'View' : p.status === 'Active' ? 'Record Litter' : 'Plan Mating'
          }
          onAction={() => onAction(p)}
        />
      ))}
    </>
  );
}
