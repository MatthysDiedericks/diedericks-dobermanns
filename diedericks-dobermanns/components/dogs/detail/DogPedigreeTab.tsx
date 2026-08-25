import { View } from 'react-native';

import { PedigreeTree } from '@/components/dogs/PedigreeTree';
import { Typography } from '@/components/ui/Typography';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { useInheritedPedigree } from '@/hooks/useInheritedPedigree';
import { formatCoiPercent } from '@/lib/dogs/formatCoi';
import { hasPedigreeAncestors } from '@/hooks/useDogPedigree';

export function DogPedigreeTab({
  dogId,
  displayName,
  profileRoutePrefix,
  disableAncestorLinks,
  showCoi = true,
}: {
  dogId: string;
  displayName: string;
  profileRoutePrefix?: string;
  disableAncestorLinks?: boolean;
  showCoi?: boolean;
}) {
  const ped = useInheritedPedigree(dogId, displayName);

  if (ped.loading) return <CardListSkeleton count={2} />;

  return (
    <View className="pb-8">
      {ped.sireMissing ? (
        <Typography variant="caption" className="mb-2 text-subtle">
          Pedigree not yet recorded for {ped.sireMissing}.
        </Typography>
      ) : null}
      {ped.damMissing ? (
        <Typography variant="caption" className="mb-2 text-subtle">
          Pedigree not yet recorded for {ped.damMissing}.
        </Typography>
      ) : null}
      {showCoi && formatCoiPercent(ped.wrightsCoi) ? (
        <Typography variant="caption" className="mb-3 text-muted">
          Wright&apos;s COI {formatCoiPercent(ped.wrightsCoi)}
        </Typography>
      ) : null}
      {hasPedigreeAncestors(ped.ancestors) ? (
        <PedigreeTree
          dogId={dogId}
          displayName={displayName}
          profileRoutePrefix={profileRoutePrefix}
          ancestors={ped.ancestors}
          registeredName={ped.registeredName}
          wrightsCoi={null}
          disableAncestorLinks={disableAncestorLinks}
        />
      ) : (
        <Typography variant="bodyMuted">Pedigree not yet recorded</Typography>
      )}
    </View>
  );
}
