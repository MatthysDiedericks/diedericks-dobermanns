// hooks/useMutations.ts — re-export barrel for domain mutation modules
export * from '@/lib/dogs/mutations';
export * from '@/lib/finance/mutations';
export * from '@/lib/clients/mutations';
export * from '@/lib/admin/mutations';
export type { MutationResult, SaveResult } from '@/lib/shared/mutationTypes';
export { useSubmitting } from '@/lib/shared/useSubmitting';
