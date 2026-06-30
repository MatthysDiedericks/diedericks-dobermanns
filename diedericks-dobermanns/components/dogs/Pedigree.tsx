import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { DogPedigree, PedigreeNode, PedigreeSlot } from '@/types/app.types';

/** True when a pedigree object carries at least one named ancestor. */
export function hasPedigree(pedigree?: DogPedigree | null): boolean {
  if (!pedigree) return false;
  return Object.values(pedigree).some(
    (node) => node && typeof node === 'object' && Boolean((node as PedigreeNode).name?.trim()),
  );
}

interface NodeCardProps {
  node?: PedigreeNode;
  generation: number;
}

function NodeCard({ node, generation }: NodeCardProps) {
  const name = node?.name?.trim();
  if (!name) {
    return (
      <View className="rounded-xl border border-dashed border-gold/15 bg-black-rich px-3 py-2.5">
        <Typography variant="caption" className="italic">
          Unknown
        </Typography>
      </View>
    );
  }
  return (
    <View className="rounded-xl border border-gold/15 bg-black-rich px-3 py-2.5">
      <Typography variant={generation === 0 ? 'subtitle' : 'body'} numberOfLines={2}>
        {name}
      </Typography>
      {node?.titles?.trim() ? (
        <Typography variant="label" className="mt-0.5">
          {node.titles.trim()}
        </Typography>
      ) : null}
      {node?.registration?.trim() ? (
        <Typography variant="caption" className="mt-0.5">
          {node.registration.trim()}
        </Typography>
      ) : null}
    </View>
  );
}

interface BranchProps {
  pedigree: DogPedigree;
  slot: PedigreeSlot;
  generation: number;
  maxGeneration: number;
}

/**
 * Recursively renders an ancestor and its sire/dam below it. Child slots are
 * derived by appending 'Sire' / 'Dam' to the current slot key, mirroring the
 * flat DogPedigree shape (e.g. sire -> sireSire / sireDam).
 */
function Branch({ pedigree, slot, generation, maxGeneration }: BranchProps) {
  const node = pedigree[slot];
  const sireSlot = `${slot}Sire` as PedigreeSlot;
  const damSlot = `${slot}Dam` as PedigreeSlot;
  const showChildren = generation < maxGeneration;

  return (
    <View>
      <NodeCard node={node} generation={generation} />
      {showChildren ? (
        <View className="mt-2 gap-2 border-l border-gold/15 pl-3">
          <Branch
            pedigree={pedigree}
            slot={sireSlot}
            generation={generation + 1}
            maxGeneration={maxGeneration}
          />
          <Branch
            pedigree={pedigree}
            slot={damSlot}
            generation={generation + 1}
            maxGeneration={maxGeneration}
          />
        </View>
      ) : null}
    </View>
  );
}

interface PedigreeProps {
  pedigree: DogPedigree;
  /** How many ancestor generations to render (1–3). Defaults to 3. */
  generations?: number;
}

/** Read-only ancestry chart rendered as an indented sire/dam tree. */
export function Pedigree({ pedigree, generations = 3 }: PedigreeProps) {
  const maxGeneration = Math.min(Math.max(generations, 1), 3);
  return (
    <View className="gap-4">
      <View>
        <Typography variant="label" className="mb-2 text-silver">
          Sire (Father)
        </Typography>
        <Branch pedigree={pedigree} slot="sire" generation={0} maxGeneration={maxGeneration} />
      </View>
      <View>
        <Typography variant="label" className="mb-2 text-silver">
          Dam (Mother)
        </Typography>
        <Branch pedigree={pedigree} slot="dam" generation={0} maxGeneration={maxGeneration} />
      </View>
    </View>
  );
}
