import type { PedigreeAncestor } from '@/hooks/useDogPedigree';
import { pedigreeDisplayName } from '@/lib/dogs/pedigreeName';

export type ParentPedigree = {
  id: string;
  name: string;
  registeredName: string | null;
  callName?: string | null;
  ancestors: PedigreeAncestor[];
};

const MAX_PUPPY_GENERATIONS = 4;

function displayName(parent: ParentPedigree): string {
  return pedigreeDisplayName({
    registeredName: parent.registeredName,
    callName: parent.callName,
    name: parent.name,
  });
}

function shiftSide(side: 'S' | 'D', rows: PedigreeAncestor[]): PedigreeAncestor[] {
  return rows
    .map((row) => ({
      ...row,
      position: `${side}${row.position}`,
      generation: row.generation + 1,
    }))
    .filter(
      (row) =>
        row.generation <= MAX_PUPPY_GENERATIONS &&
        row.position.length <= MAX_PUPPY_GENERATIONS,
    );
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

export function countBySide(ancestors: PedigreeAncestor[]): { sire: number; dam: number } {
  return {
    sire: ancestors.filter((a) => a.position.startsWith('S')).length,
    dam: ancestors.filter((a) => a.position.startsWith('D')).length,
  };
}
