import type { PedigreeAncestor } from '@/hooks/useDogPedigree';

export type ParentPedigree = {
  id: string;
  name: string;
  registeredName: string | null;
  ancestors: PedigreeAncestor[];
};

function displayName(parent: ParentPedigree): string {
  return parent.registeredName?.trim() || parent.name;
}

function shiftSide(side: 'S' | 'D', rows: PedigreeAncestor[]): PedigreeAncestor[] {
  return rows.map((row) => ({
    ...row,
    position: `${side}${row.position}`,
    generation: row.generation + 1,
  }));
}

function parentAsGenerationOne(side: 'S' | 'D', parent: ParentPedigree): PedigreeAncestor {
  return {
    position: side,
    generation: 1,
    registeredName: displayName(parent),
    dateOfBirth: null,
    wrightsCoi: null,
    titlesHealth: null,
    ownAncestorId: parent.id,
  };
}

/** Puppy pedigree from sire and dam — puppies have no pedigree_ancestors of their own. */
export function inheritPedigreeFromParents(
  sire: ParentPedigree | null,
  dam: ParentPedigree | null,
): PedigreeAncestor[] {
  const rows: PedigreeAncestor[] = [];
  if (sire) {
    rows.push(parentAsGenerationOne('S', sire), ...shiftSide('S', sire.ancestors));
  }
  if (dam) {
    rows.push(parentAsGenerationOne('D', dam), ...shiftSide('D', dam.ancestors));
  }
  return rows;
}

export function parentHasPedigree(parent: ParentPedigree | null): boolean {
  return Boolean(parent?.ancestors.some((a) => Boolean(a.registeredName?.trim())));
}
