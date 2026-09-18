import { View } from 'react-native';

import {
  PedigreeNode,
  ancestorNodeLabel,
} from '@/components/dogs/PedigreeNode';
import { Typography } from '@/components/ui/Typography';
import type { PedigreeAncestor } from '@/hooks/useDogPedigree';
import { generationColumnTitle, positionsForDepth } from '@/lib/pedigree/generation';

function namedOnSide(
  byPos: Map<string, PedigreeAncestor>,
  side: 'S' | 'D',
  generation: number,
): PedigreeAncestor[] {
  return positionsForDepth(generation)
    .filter((p) => p.startsWith(side) && p.length === generation)
    .map((p) => byPos.get(p))
    .filter((a): a is PedigreeAncestor => Boolean(a?.registeredName?.trim()));
}

function LineSection({
  side,
  label,
  depth,
  byPos,
  photoUrl,
  onOwnDogPress,
}: {
  side: 'S' | 'D';
  label: string;
  depth: number;
  byPos: Map<string, PedigreeAncestor>;
  photoUrl: (a: PedigreeAncestor) => string | null;
  onOwnDogPress?: (id: string) => void;
}) {
  const blocks: { generation: number; rows: PedigreeAncestor[] }[] = [];
  for (let generation = 2; generation <= depth; generation++) {
    const rows = namedOnSide(byPos, side, generation);
    if (rows.length > 0) blocks.push({ generation, rows });
  }
  if (blocks.length === 0) return null;

  return (
    <View className="mt-5">
      <Typography variant="caption" className="text-[#C4A35A]">
        {label}
      </Typography>
      {blocks.map((block) => (
        <View key={block.generation} className="mt-2">
          <Typography variant="caption" className="mb-1 text-[#C4A35A]">
            {generationColumnTitle(block.generation)}
          </Typography>
          <View className="gap-1">
            {block.rows.map((a) => (
              <View key={a.position} style={{ minHeight: 72 }}>
                <PedigreeNode
                  label={ancestorNodeLabel(a)}
                  titlesHealth={a.titlesHealth}
                  dateOfBirth={a.dateOfBirth}
                  photoUrl={photoUrl(a)}
                  generation={generationFrom(a)}
                  onPress={
                    a.ownAncestorId && onOwnDogPress
                      ? () => onOwnDogPress(a.ownAncestorId!)
                      : undefined
                  }
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function generationFrom(a: PedigreeAncestor): number {
  return a.position.length || a.generation;
}

export function PedigreeMobileChart({
  depth,
  ancestors,
  photoUrl,
  onOwnDogPress,
  subjectLabel,
  subjectPhotoUrl,
}: {
  depth: number;
  ancestors: PedigreeAncestor[];
  photoUrl: (a: PedigreeAncestor) => string | null;
  onOwnDogPress?: (id: string) => void;
  subjectLabel: string;
  subjectPhotoUrl: string | null;
}) {
  const byPos = new Map(ancestors.map((a) => [a.position, a]));
  const sire = byPos.get('S');
  const dam = byPos.get('D');

  return (
    <View>
      <View style={{ minHeight: 180 }}>
        <PedigreeNode
          label={subjectLabel}
          generation={0}
          emphasis
          photoUrl={subjectPhotoUrl}
        />
      </View>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Typography variant="caption" className="mb-1 text-[#C4A35A]">
            Sire
          </Typography>
          <View style={{ minHeight: 120 }}>
            {sire?.registeredName?.trim() ? (
              <PedigreeNode
                label={ancestorNodeLabel(sire)}
                titlesHealth={sire.titlesHealth}
                dateOfBirth={sire.dateOfBirth}
                photoUrl={photoUrl(sire)}
                generation={1}
                onPress={
                  sire.ownAncestorId && onOwnDogPress
                    ? () => onOwnDogPress(sire.ownAncestorId!)
                    : undefined
                }
              />
            ) : (
              <PedigreeNode label="" generation={1} empty />
            )}
          </View>
        </View>
        <View className="flex-1">
          <Typography variant="caption" className="mb-1 text-[#C4A35A]">
            Dam
          </Typography>
          <View style={{ minHeight: 120 }}>
            {dam?.registeredName?.trim() ? (
              <PedigreeNode
                label={ancestorNodeLabel(dam)}
                titlesHealth={dam.titlesHealth}
                dateOfBirth={dam.dateOfBirth}
                photoUrl={photoUrl(dam)}
                generation={1}
                onPress={
                  dam.ownAncestorId && onOwnDogPress
                    ? () => onOwnDogPress(dam.ownAncestorId!)
                    : undefined
                }
              />
            ) : (
              <PedigreeNode label="" generation={1} empty />
            )}
          </View>
        </View>
      </View>
      {depth > 1 ? (
        <>
          <LineSection
            side="S"
            label="SIRE LINE"
            depth={depth}
            byPos={byPos}
            photoUrl={photoUrl}
            onOwnDogPress={onOwnDogPress}
          />
          <LineSection
            side="D"
            label="DAM LINE"
            depth={depth}
            byPos={byPos}
            photoUrl={photoUrl}
            onOwnDogPress={onOwnDogPress}
          />
        </>
      ) : null}
    </View>
  );
}
