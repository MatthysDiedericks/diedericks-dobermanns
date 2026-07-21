import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import {
  PEDIGREE_COLUMN_WIDTH,
  PEDIGREE_NODE_MIN_HEIGHT,
  PedigreeNode,
  ancestorIsSireSide,
  ancestorNodeLabel,
  subjectNodeLabel,
} from '@/components/dogs/PedigreeNode';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import {
  hasPedigreeAncestors,
  useDogPedigree,
  type PedigreeAncestor,
} from '@/hooks/useDogPedigree';
import {
  maxPedigreeGeneration,
  pedigreeRowSpan,
  positionToRowIndex,
} from '@/lib/pedigree/layout';

interface PedigreeTreeProps {
  dogId: string;
  /** Short display name when registered_name is missing on the subject. */
  displayName?: string;
  /** Route prefix for own-kennel ancestor taps, e.g. `/(admin)/dogs/` */
  profileRoutePrefix?: string;
}

function ColumnNodes({
  generation,
  maxGen,
  ancestors,
  onOwnDogPress,
}: {
  generation: number;
  maxGen: number;
  ancestors: PedigreeAncestor[];
  onOwnDogPress: (id: string) => void;
}) {
  const rowSpan = pedigreeRowSpan(generation, maxGen);
  const cellHeight = PEDIGREE_NODE_MIN_HEIGHT * rowSpan;
  const nodes = ancestors.filter(
    (a) => a.position.length === generation || a.generation === generation,
  );

  return (
    <View style={{ width: PEDIGREE_COLUMN_WIDTH, height: PEDIGREE_NODE_MIN_HEIGHT * 2 ** maxGen }}>
      {nodes.map((a) => {
        const row = positionToRowIndex(a.position);
        const top = row * PEDIGREE_NODE_MIN_HEIGHT * rowSpan;
        return (
          <View
            key={a.position}
            style={{
              position: 'absolute',
              top,
              left: 4,
              right: 4,
              height: cellHeight - 4,
            }}
          >
            <PedigreeNode
              label={ancestorNodeLabel(a)}
              titlesHealth={a.titlesHealth}
              dateOfBirth={a.dateOfBirth}
              wrightsCoi={a.wrightsCoi}
              sireSide={ancestorIsSireSide(a.position)}
              onPress={a.ownAncestorId ? () => onOwnDogPress(a.ownAncestorId!) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

export function PedigreeTree({
  dogId,
  displayName = 'This dog',
  profileRoutePrefix = '/(admin)/dogs/',
}: PedigreeTreeProps) {
  const router = useRouter();
  const { ancestors, registeredName, wrightsCoi, loading, error } = useDogPedigree(dogId);

  if (loading) return <CardListSkeleton count={2} />;
  if (error) {
    return (
      <Typography variant="body" className="text-danger">
        {error}
      </Typography>
    );
  }
  if (!hasPedigreeAncestors(ancestors)) return null;

  const positions = ancestors.map((a) => a.position);
  const maxGen = maxPedigreeGeneration(positions);
  const totalHeight = PEDIGREE_NODE_MIN_HEIGHT * 2 ** maxGen;

  function openProfile(ownId: string) {
    router.push(`${profileRoutePrefix}${ownId}` as never);
  }

  return (
    <View>
      <Typography variant="caption" className="mb-3 text-muted">
        Scroll horizontally to explore {maxGen} generation{maxGen === 1 ? '' : 's'} · Sire branch
        (top) · Dam branch (bottom)
      </Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row pr-4" style={{ minHeight: totalHeight }}>
          <View
            style={{
              width: PEDIGREE_COLUMN_WIDTH,
              height: totalHeight,
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <PedigreeNode
              label={subjectNodeLabel(registeredName, displayName)}
              wrightsCoi={wrightsCoi}
              emphasis
            />
          </View>
          {Array.from({ length: maxGen }, (_, i) => i + 1).map((gen) => (
            <ColumnNodes
              key={gen}
              generation={gen}
              maxGen={maxGen}
              ancestors={ancestors}
              onOwnDogPress={openProfile}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
