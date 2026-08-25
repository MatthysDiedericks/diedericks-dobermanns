import { View } from 'react-native';

import { PedigreeTree } from '@/components/dogs/PedigreeTree';
import { LineageParentCard } from '@/components/portal/LineageParentCard';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { AssignedLitter, LineageParent } from '@/hooks/useCommittedBreeding';
import { useInheritedPedigreeFromParents } from '@/hooks/useInheritedPedigree';
import { formatGoHomeLabel } from '@/lib/fulfilment/goHome';
import { formatKennelDate } from '@/lib/kennel/formatters';

function pairingLabel(parents: LineageParent[]): string {
  const dam = parents.find((p) => p.role === 'dam');
  const sire = parents.find((p) => p.role === 'sire');
  const damName = dam?.callName?.trim() || dam?.name;
  const sireName = sire?.callName?.trim() || sire?.name;
  if (damName && sireName) return `${damName} × ${sireName}`;
  return damName ?? sireName ?? 'Your litter';
}

export function CommittedLitterPanel({
  litter,
  parents,
  showPreAllocationNote = true,
}: {
  litter: AssignedLitter | null;
  parents: LineageParent[];
  showPreAllocationNote?: boolean;
}) {
  const pedigree = useInheritedPedigreeFromParents(parents);
  const dueSource = litter?.actualDate ?? litter?.expectedDate;
  const due = dueSource ? `Due ${formatKennelDate(dueSource)}` : null;
  const goHome = litter
    ? formatGoHomeLabel({
        go_home_date: litter.goHomeDate,
        go_home_earliest: litter.goHomeEarliest,
        go_home_latest: litter.goHomeLatest,
      })
    : null;

  return (
    <View>
      {litter ? (
        <Card className="mb-4">
          <Typography variant="label">Your litter</Typography>
          <Typography variant="title" className="mt-1">
            {pairingLabel(parents)}
          </Typography>
          <Typography variant="caption" className="mt-2">
            {[due, goHome ? `collection planned for ${goHome}` : null].filter(Boolean).join(' · ') ||
              'Dates will appear here once they are set.'}
          </Typography>
        </Card>
      ) : null}

      {parents.map((parent) => (
        <LineageParentCard key={parent.id} parent={parent} />
      ))}

      <Typography variant="label" className="mb-2 mt-2">
        Full pedigree
      </Typography>
      {pedigree.sireMissing ? (
        <Typography variant="bodyMuted" className="mb-2">
          Pedigree not yet recorded for the sire.
        </Typography>
      ) : null}
      {pedigree.damMissing ? (
        <Typography variant="bodyMuted" className="mb-2">
          Pedigree not yet recorded for the dam.
        </Typography>
      ) : null}
      <PedigreeTree
        dogId={parents[0]?.id ?? ''}
        displayName="Your puppy"
        ancestors={pedigree.ancestors}
        emptyLabel="Pedigree not yet recorded."
        disableAncestorLinks
      />

      {showPreAllocationNote ? (
        <Typography variant="bodyMuted" className="mt-4">
          Your puppy has not been chosen yet. Once she is allocated to you, her photos, weights,
          vaccinations and progress appear here.
        </Typography>
      ) : null}
    </View>
  );
}

export function WaitingListPlainMessage() {
  return (
    <Card className="items-center py-8">
      <Typography variant="title" className="text-center">
        You are on the waiting list.
      </Typography>
      <Typography variant="bodyMuted" className="mt-3 text-center">
        We will be in touch as soon as a litter is matched to you.
      </Typography>
    </Card>
  );
}
