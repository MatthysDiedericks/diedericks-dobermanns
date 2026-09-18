import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { GenerationSelector } from '@/components/dogs/GenerationSelector';
import { PedigreeMobileChart } from '@/components/dogs/PedigreeMobileChart';
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
import { formatCoiPercent } from '@/lib/dogs/formatCoi';
import { pickPedigreePhoto } from '@/lib/dogs/profilePhoto';
import { generationColumnTitle, positionsForDepth } from '@/lib/pedigree/generation';
import {
  maxPedigreeGeneration,
  pedigreeRowSpan,
  positionToRowIndex,
} from '@/lib/pedigree/layout';
import { resolveAncestorPhoto } from '@/lib/pedigree/resolveAncestorPhoto';
import { usePedigreeDepth } from '@/lib/pedigree/usePedigreeDepth';

interface PedigreeTreeProps {
  dogId: string;
  displayName?: string;
  profileRoutePrefix?: string;
  ancestors?: PedigreeAncestor[];
  registeredName?: string | null;
  registrationNumber?: string | null;
  wrightsCoi?: number | null;
  emptyLabel?: string;
  disableAncestorLinks?: boolean;
  publicOnly?: boolean;
}

function issuedOn(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  registrationNumber: registrationNumberProp,
  wrightsCoi: wrightsCoiProp,
  emptyLabel,
  disableAncestorLinks,
  publicOnly = false,
}: PedigreeTreeProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const fetched = useDogPedigree(ancestorsProp ? '' : dogId);
  const ancestors = ancestorsProp ?? fetched.ancestors;
  const registeredName = registeredNameProp ?? fetched.registeredName;
  const registrationNumber = registrationNumberProp ?? fetched.registrationNumber;
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
  const narrow = width < 640;

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

  const subjectPhoto = (() => {
    const own = photos.ownDogs.get(dogId);
    if (!own) return null;
    const picked = pickPedigreePhoto(own.media, own.pedigreePhotoMediaId);
    return picked?.thumbnail_url || picked?.url || null;
  })();
  const subjectLabel = subjectNodeLabel(registeredName, displayName);
  const onOwnDogPress = disableAncestorLinks ? undefined : openProfile;
  const coi = formatCoiPercent(wrightsCoi);
  const footerLine = [registrationNumber?.trim() || null, issuedOn()].filter(Boolean).join(' · ');

  return (
    <View>
      <GenerationSelector maxGen={maxGen} depth={depth} onChange={setDepth} surface="app" />
      <View className="border border-[#C4A35A] bg-[#111008] p-3">
        <View className="mb-3 items-center border-b border-[#C4A35A] pb-3">
          <Image
            source={require('@/assets/monogram-source.png')}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
          <Typography variant="label" className="mt-2 text-center tracking-[0.2em] text-[#C4A35A]">
            DIEDERICKS DOBERMANNS
          </Typography>
          <Typography variant="caption" className="mt-1 text-center uppercase tracking-widest text-[#F5F0E8]">
            {subjectLabel}
          </Typography>
        </View>

        {narrow ? (
          <PedigreeMobileChart
            depth={depth}
            ancestors={visible}
            photoUrl={photoFor}
            onOwnDogPress={onOwnDogPress}
            subjectLabel={subjectLabel}
            subjectPhotoUrl={subjectPhoto}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row pr-4" style={{ minHeight: totalHeight }}>
              <View style={{ width: 18, height: totalHeight, justifyContent: 'space-around' }}>
                <Typography
                  variant="caption"
                  className="text-[#C4A35A]"
                  style={{ transform: [{ rotate: '-90deg' }] }}
                >
                  SIRE LINE
                </Typography>
                <Typography
                  variant="caption"
                  className="text-[#C4A35A]"
                  style={{ transform: [{ rotate: '-90deg' }] }}
                >
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
                  label={subjectLabel}
                  generation={0}
                  emphasis
                  photoUrl={subjectPhoto}
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
                    onOwnDogPress={onOwnDogPress}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="mt-3 border-t border-[#C4A35A] pt-2">
          {footerLine ? (
            <Typography variant="caption" className="text-center text-[#A8A090]">
              {footerLine}
            </Typography>
          ) : null}
          {coi ? (
            <Typography variant="caption" className="mt-1 text-center text-[#A8A090]">
              Wright&apos;s COI {coi} over {maxGen} generations
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
