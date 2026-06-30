export interface MutationResult {
  error: string | null;
}

export interface SaveResult extends MutationResult {
  id: string | null;
}

export const ok: MutationResult = { error: null };

/** Simulated latency so demo-mode mutations feel real. */
export async function simulate(): Promise<MutationResult> {
  await new Promise((r) => setTimeout(r, 500));
  return ok;
}
