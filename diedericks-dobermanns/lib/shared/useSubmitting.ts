import { useState } from 'react';

import type { MutationResult } from '@/lib/shared/mutationTypes';

/** Tiny helper to track a single in-flight mutation's loading state. */
export function useSubmitting() {
  const [submitting, setSubmitting] = useState(false);
  async function run<T extends MutationResult>(fn: () => Promise<T>): Promise<T> {
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, run };
}
