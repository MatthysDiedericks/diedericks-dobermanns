import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { GenerationSelector } from '@/components/dogs/GenerationSelector';
import {
  PEDIGREE_COLUMN_WIDTH,
  PEDIGREE_NODE_MIN_HEIGHT,
  PedigreeNode,
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
import { usePedigreePhotoMaps } from '@/hooks/usePedigreePhotoMaps';
import {
  maxPedigreeGeneration,
  pedigreeRowSpan,
  positionToRowIndex,
} from '@/lib/pedigree/layout';
import { generationColumnTitle, positionsForDepth } from '@/lib/pedigree/generation';
import { usePedigreeDepth } from '@/lib/pedigree/usePedigreeDepth';
import { pickPedigreePhoto } from '@/lib/dogs/profilePhoto';
import { resolveAncestorPhoto } from '@/lib/pedigree/resolveAncestorPhoto';

interface PedigreeTreeProps {
  dogId: string;
  displayName?: string;
  profileRoutePrefix?: string;
  ancestors?: PedigreeAncestor[];
  registeredName?: string | null;
  wrightsCoi?: number | null;
  emptyLabel?: string;
  disableAncestorLinks?: boolean;
  publicOnly?: boolean;
}

function ColumnNodes({
  generation,
  depth,
  ancestors,
  photoUrl,
  onOwnDogPress,
}: {
  generation: number;
  depth: number;
  ancestors: PedigreeAncestor[];
  photoUrl: (a: PedigreeAncestor) => string | null;
  onOwnDogPress?: (id: string) => void;
}) {
  const rowSpan = pedigreeRowSpan(generation, depth);
  const cellHeight = PEDIGREE_NODE_MIN_HEIGHT * rowSpan;
  const byPos = new Map(ancestors.map((a) => [a.position, a]));

  return (
    <View style={{ width: PEDIGREE_COLUMN_WIDTH, height: PEDIGREE_NODE_MIN_HEIGHT * 2 ** depth }}>
      {positionsForDepth(depth)
        .filter((p) => p.length === generation)
        .map((position) => {
          const a = byPos.get(position);
          const named = Boolean(a?.registeredName?.trim());
          const row = positionToRowIndex(position);
          const top = row * PEDIGREE_NODE_MIN_HEIGHT * rowSpan;
          return (
            <View
              key={position}
              style={{
                position: 'absolute',
                top,
                left: 4,
                right: 4,
                height: cellHeight - 4,
              }}
            >
              {named && a ? (
                <PedigreeNode
                  label={ancestorNodeLabel(a)}
                  titlesHealth={a.titlesHealth}
                  dateOfBirth={a.dateOfBirth}
                  photoUrl={photoUrl(a)}
                  generation={generation}
                  onPress={
                    a.ownAncestorId && onOwnDogPress
                      ? () => onOwnDogPress(a.ownAncestorId!)
                      : undefined
                  }
                />
              ) : (
                <PedigreeNode label="" generation={generation} empty />
              )}
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
  ancestors: ancestorsProp,
  registeredName: registeredNameProp,
  wrightsCoi: wrightsCoiProp,
  emptyLabel,
  disableAncestorLinks,
  publicOnly = false,
}: PedigreeTreeProps) {
  const router = useRouter();
  const fetched = useDogPedigree(ancestorsProp ? '' : dogId);
  const ancestors = ancestorsProp ?? fetched.ancestors;
  const registeredName = registeredNameProp ?? fetched.registeredName;
  const wrightsCoi = wrightsCoiProp ?? fetched.wrightsCoi;
  const loading = ancestorsProp ? false : fetched.loading;
  const error = ancestorsProp ? null : fetched.error;

  const ownIds = ancestors.map((a) => a.ownAncestorId).filter((id): id is string => Boolean(id));
  if (dogId) ownIds.push(dogId);
  const photos = usePedigreePhotoMaps(ownIds);

  const maxGen = maxPedigreeGeneration(ancestors.map((a) => a.position));
  const { depth, setDepth } = usePedigreeDepth(maxGen, 'app');
  const visible = ancestors.filter((a) => a.position.length <= depth);
  const totalHeight = PEDIGREE_NODE_MIN_HEIGHT * (depth > 0 ? 2 ** depth : 1);

  if (loading) return <CardListSkeleton count={2} />;
  if (error) {
    return (
      <Typography variant="body" className="text-danger">
        {error}
      </Typography>
    );
  }
  if (!hasPedigreeAncestors(ancestors)) {
    return emptyLabel ? (
      <Typography variant="bodyMuted">{emptyLabel}</Typography>
    ) : null;
  }

  function openProfile(ownId: string) {
    router.push(`${profileRoutePrefix}${ownId}` as never);
  }

  function photoFor(a: PedigreeAncestor): string | null {
    return resolveAncestorPhoto({
      registeredName: a.registeredName,
      ownAncestorId: a.ownAncestorId,
      ownDogs: photos.ownDogs,
      ancestorPhotos: photos.ancestorPhotos,
      publicOnly,
    });
  }

  return (
    <View>
      <GenerationSelector maxGen={maxGen} depth={depth} onChange={setDepth} surface="app" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row pr-4" style={{ minHeight: totalHeight }}>
          <View
            style={{
              width: 18,
              height: totalHeight,
              justifyContent: 'space-around',
            }}
          >
            <Typography variant="caption" className="text-[#C4A35A]" style={{ transform: [{ rotate: '-90deg' }] }}>
              SIRE LINE
            </Typography>
            <Typography variant="caption" className="text-[#C4A35A]" style={{ transform: [{ rotate: '-90deg' }] }}>
              DAM LINE
            </Typography>
          </View>
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
              generation={0}
              emphasis
              photoUrl={(() => {
                const own = photos.ownDogs.get(dogId);
                if (!own) return null;
                const picked = pickPedigreePhoto(own.media, own.pedigreePhotoMediaId);
                return picked?.thumbnail_url || picked?.url || null;
              })()}
            />
          </View>
          {Array.from({ length: depth }, (_, i) => i + 1).map((gen) => (
            <View key={gen}>
              <Typography variant="caption" className="mb-1 text-center text-[#C4A35A]">
                {generationColumnTitle(gen)}
              </Typography>
              <ColumnNodes
                generation={gen}
                depth={depth}
                ancestors={visible}
                photoUrl={photoFor}
                onOwnDogPress={disableAncestorLinks ? undefined : openProfile}
              />
            </View>
          ))}
        </View>
      </ScrollView>
      {wrightsCoi != null ? (
        <Typography variant="caption" className="mt-2 text-[#A8A090]">
          Wright&apos;s COI {wrightsCoi.toFixed(1)}% over {maxGen} generations
        </Typography>
      ) : null}
    </View>
  );
}
