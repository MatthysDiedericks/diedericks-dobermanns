import type { AllocationType } from '@/lib/finance/allocation';

export function reclassifyPayload(input: {
  allocationType: AllocationType;
  dogId?: string | null;
  litterId?: string | null;
}): { allocation_type: AllocationType; dog_id: string | null; litter_id: string | null } {
  if (input.allocationType === 'dog') {
    return {
      allocation_type: 'dog',
      dog_id: input.dogId || null,
      litter_id: null,
    };
  }
  if (input.allocationType === 'litter') {
    return {
      allocation_type: 'litter',
      dog_id: null,
      litter_id: input.litterId || null,
    };
  }
  if (input.allocationType === 'company') {
    return { allocation_type: 'company', dog_id: null, litter_id: null };
  }
  return { allocation_type: 'shared', dog_id: null, litter_id: null };
}

export function reclassifyError(input: {
  ids: string[];
  allocationType: AllocationType;
  dogId?: string | null;
  litterId?: string | null;
}): string | null {
  if (input.ids.length === 0) return 'Select at least one expense.';
  if (input.allocationType === 'dog' && !input.dogId) return 'Pick the dog these costs belong to.';
  if (input.allocationType === 'litter' && !input.litterId) {
    return 'Pick the litter these costs belong to.';
  }
  return null;
}

export function reclassifyDirectAllocation(input: {
  allocationType: AllocationType;
  dogId?: string | null;
  litterId?: string | null;
  lineAmount: number;
}): {
  dog_id: string | null;
  litter_id: string | null;
  amount: number;
  weight: number;
  basis_note: string;
} | null {
  if (input.allocationType === 'dog' && input.dogId) {
    return {
      dog_id: input.dogId,
      litter_id: null,
      amount: input.lineAmount,
      weight: 1,
      basis_note: 'direct to one dog',
    };
  }
  if (input.allocationType === 'litter' && input.litterId) {
    return {
      dog_id: null,
      litter_id: input.litterId,
      amount: input.lineAmount,
      weight: 1,
      basis_note: 'direct to one litter',
    };
  }
  return null;
}
