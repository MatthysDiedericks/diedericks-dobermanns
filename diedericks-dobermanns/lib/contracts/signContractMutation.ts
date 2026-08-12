import { simulate, type MutationResult } from '@/lib/shared/mutationTypes';
import { supabase } from '@/lib/supabase';

export interface ContractSignaturePayload {
  signatureStoragePath: string;
  device: string;
  ip: string | null;
}

/**
 * Records the client's in-app drawn signature and auto-finalises the
 * contract — no separate admin step needed.
 *
 * Goes through the `sign_contract_as_client` RPC rather than a direct table
 * `.update()`: `contracts` RLS only grants clients SELECT on their own rows
 * (admins have the only write policy), so a signed-in client can't UPDATE
 * this table directly. The RPC is a SECURITY DEFINER function that verifies
 * the caller owns the contract and it isn't already signed, then writes only
 * the signature-audit columns — see migration 0038.
 */
export async function signContract(id: string, signature: ContractSignaturePayload): Promise<MutationResult> {
  if (!supabase) return simulate();
  // p_ip is optional; omit rather than passing null/undefined (merged RPC types disagree).
  const { error } = await supabase.rpc(
    'sign_contract_as_client',
    signature.ip
      ? {
          p_contract_id: id,
          p_signature_url: signature.signatureStoragePath,
          p_device: signature.device,
          p_ip: signature.ip,
        }
      : {
          p_contract_id: id,
          p_signature_url: signature.signatureStoragePath,
          p_device: signature.device,
        },
  );
  if (error) {
    void import('@/lib/errors/logError').then(({ logError }) =>
      logError({
        code: 'CONTRACT_SIGN_FAILED',
        area: 'contract',
        severity: 'error',
        message: error.message,
        detail: { device: signature.device },
        entityType: 'contract',
        entityId: id,
        surface: 'app',
        actorRole: 'client',
      }),
    );
  }
  return { error: error?.message ?? null };
}
