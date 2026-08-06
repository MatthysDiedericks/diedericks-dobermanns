import { requireSupabase } from '@/lib/supabase';

export type PairingSeverity = 'ok' | 'caution' | 'prohibited';

export interface PairingEvaluation {
  allowed: boolean;
  severity: PairingSeverity;
  coiEstimate: number | null;
  reasons: string[];
}

/**
 * Single source of truth for breeding-pairing legality + COI. Calls the
 * `evaluate_pairing` Postgres function (supabase/migrations/0050_evaluate_pairing.sql)
 * so the app and diedericksdobermann-web can never disagree about which
 * matings are permitted. Do not reimplement pairing rules in TypeScript —
 * add new rules to the SQL function instead.
 */
export async function evaluatePairing(
  sireId: string,
  damId: string,
): Promise<PairingEvaluation | null> {
  try {
    const { data, error } = await requireSupabase().rpc('evaluate_pairing', {
      p_sire_id: sireId,
      p_dam_id: damId,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      allowed: Boolean(row.allowed),
      severity: (row.severity as PairingSeverity) ?? 'prohibited',
      coiEstimate: row.coi_estimate == null ? null : Number(row.coi_estimate),
      reasons: (row.reasons as string[] | null) ?? [],
    };
  } catch (e) {
    console.error('[evaluatePairing]', e);
    return null;
  }
}
